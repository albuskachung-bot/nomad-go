import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OpenWeatherMapResponse = {
  name?: string;
  sys?: {
    country?: string;
  };
  main?: {
    temp?: number;
  };
  weather?: Array<{
    description?: string;
    icon?: string;
  }>;
  message?: string;
};

type WeatherSummary = {
  city: string;
  country?: string;
  temperature: number;
  description: string;
  iconUrl: string;
};

class WeatherRouteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const OPEN_WEATHER_MAP_URL = "https://api.openweathermap.org/data/2.5/weather";
const MAX_CITY_REQUESTS = 8;

function normalizeCities(value: string | null) {
  if (!value) {
    return [];
  }

  const separator = value.includes("|") ? "|" : ",";

  return Array.from(
    new Set(
      value
        .split(separator)
        .map((city) => city.trim())
        .filter(Boolean)
    )
  );
}

function formatIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

async function fetchWeather(city: string, apiKey: string): Promise<WeatherSummary> {
  const params = new URLSearchParams({
    appid: apiKey,
    lang: "zh_tw",
    q: city,
    units: "metric"
  });

  const response = await fetch(`${OPEN_WEATHER_MAP_URL}?${params.toString()}`, {
    cache: "no-store"
  });

  const data = (await response.json().catch(() => ({}))) as OpenWeatherMapResponse;

  if (!response.ok) {
    if (response.status === 404) {
      throw new WeatherRouteError(`找不到「${city}」的天氣資料。`, 404);
    }

    throw new WeatherRouteError(
      data.message ?? "Weather service is temporarily unavailable.",
      502
    );
  }

  const weather = data.weather?.[0];
  const temperature = data.main?.temp;

  if (
    !data.name ||
    typeof temperature !== "number" ||
    !weather?.description ||
    !weather.icon
  ) {
    throw new WeatherRouteError("Weather service returned incomplete data.", 502);
  }

  return {
    city: data.name,
    country: data.sys?.country,
    temperature: Math.round(temperature),
    description: weather.description,
    iconUrl: formatIconUrl(weather.icon)
  };
}

export async function GET(request: Request) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENWEATHERMAP_API_KEY environment variable." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const cities = city ? [city] : normalizeCities(searchParams.get("cities"));

  if (!cities.length) {
    return NextResponse.json({ error: "Please provide city or cities." }, { status: 400 });
  }

  if (cities.length > MAX_CITY_REQUESTS) {
    return NextResponse.json(
      { error: `Please request ${MAX_CITY_REQUESTS} cities or fewer.` },
      { status: 400 }
    );
  }

  if (city) {
    try {
      const weather = await fetchWeather(city, apiKey);

      return NextResponse.json({ weather });
    } catch (error) {
      if (error instanceof WeatherRouteError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json({ error: "Unable to fetch weather data." }, { status: 502 });
    }
  }

  const results = await Promise.allSettled(
    cities.map(async (cityName) => fetchWeather(cityName, apiKey))
  );

  const weather = results
    .filter(
      (result): result is PromiseFulfilledResult<WeatherSummary> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  if (!weather.length) {
    const firstError = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );

    return NextResponse.json(
      {
        error:
          firstError?.reason instanceof Error
            ? firstError.reason.message
            : "Unable to fetch weather data."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ weather });
}
