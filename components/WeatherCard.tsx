"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, CloudSun, Loader2, Search, ThermometerSun } from "lucide-react";

type WeatherSummary = {
  city: string;
  country?: string;
  temperature: number;
  description: string;
  iconUrl: string;
};

type WeatherListResponse = {
  weather?: WeatherSummary[];
  error?: string;
};

type WeatherSearchResponse = {
  weather?: WeatherSummary;
  error?: string;
};

const DEFAULT_CITIES = ["Taipei,TW", "Hong Kong,HK", "Niseko,JP", "Furano,JP"];

function formatLocation(weather: WeatherSummary) {
  return weather.country ? `${weather.city}, ${weather.country}` : weather.city;
}

function getWeatherAdvice(weather: WeatherSummary) {
  const description = weather.description.toLowerCase();

  if (description.includes("雨") || description.includes("rain")) {
    return "可能有雨，建議準備雨具並預留交通時間。";
  }

  if (description.includes("雪") || description.includes("snow")) {
    return "可能降雪，建議穿防滑鞋並留意交通異動。";
  }

  if (weather.temperature <= 12) {
    return "氣溫偏低，建議攜帶保暖外套。";
  }

  if (weather.temperature <= 18) {
    return "早晚偏涼，建議準備薄外套。";
  }

  if (weather.temperature >= 30) {
    return "氣溫偏高，建議補水並避開長時間曝曬。";
  }

  return "天氣舒適，適合安排戶外移動與城市探索。";
}

async function fetchDefaultWeather(signal: AbortSignal) {
  const params = new URLSearchParams({
    cities: DEFAULT_CITIES.join("|")
  });

  const response = await fetch(`/api/weather?${params.toString()}`, { signal });
  const payload = (await response.json().catch(() => ({}))) as WeatherListResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "無法載入預設城市天氣。");
  }

  return payload.weather ?? [];
}

async function fetchCityWeather(city: string) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`/api/weather?${params.toString()}`);
  const payload = (await response.json().catch(() => ({}))) as WeatherSearchResponse;

  if (!response.ok || !payload.weather) {
    throw new Error(payload.error ?? "無法載入該城市天氣。");
  }

  return payload.weather;
}

export default function WeatherCard() {
  const [defaultWeather, setDefaultWeather] = useState<WeatherSummary[]>([]);
  const [defaultError, setDefaultError] = useState("");
  const [isDefaultLoading, setIsDefaultLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchedWeather, setSearchedWeather] = useState<WeatherSummary | null>(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWeather() {
      try {
        setIsDefaultLoading(true);
        setDefaultError("");
        const weather = await fetchDefaultWeather(controller.signal);
        setDefaultWeather(weather);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setDefaultError(error instanceof Error ? error.message : "無法載入預設城市天氣。");
      } finally {
        if (!controller.signal.aborted) {
          setIsDefaultLoading(false);
        }
      }
    }

    loadWeather();

    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const city = query.trim();

    if (!city) {
      return;
    }

    try {
      setIsSearching(true);
      setSearchError("");
      const weather = await fetchCityWeather(city);
      setSearchedWeather(weather);
    } catch (error) {
      setSearchedWeather(null);
      setSearchError(error instanceof Error ? error.message : "無法載入該城市天氣。");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="flex h-full flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          <CloudSun className="h-3.5 w-3.5" aria-hidden="true" />
          世界天氣
        </span>
      </div>

      <h2 className="mt-5 text-xl font-semibold tracking-normal text-gray-900">
        世界天氣查詢
      </h2>
      <p className="mt-3 text-sm leading-6 text-gray-500">
        出發前快速確認目的地溫度與天氣狀態。
      </p>

      <form className="mt-5" onSubmit={handleSubmit}>
        <label htmlFor="weather-city" className="sr-only">
          搜尋城市
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="weather-city"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋城市，例如 Tokyo"
            className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-24 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-1 top-1/2 inline-flex h-10 -translate-y-1/2 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-wait disabled:bg-gray-400"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            查詢
          </button>
        </div>
      </form>

      {searchError ? (
        <div className="mt-5 rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{searchError}</span>
          </div>
        </div>
      ) : null}

      {searchedWeather ? (
        <div className="mt-6 rounded-lg bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-500">
                {formatLocation(searchedWeather)}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-6xl font-semibold tracking-normal text-gray-900">
                  {searchedWeather.temperature}
                </span>
                <span className="pb-2 text-lg font-semibold text-gray-500">°C</span>
              </div>
            </div>
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={searchedWeather.iconUrl}
                alt={searchedWeather.description}
                className="h-16 w-16"
              />
            </span>
          </div>
          <p className="mt-4 text-sm font-medium capitalize text-gray-700">
            {searchedWeather.description}
          </p>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <div className="flex gap-2">
              <ThermometerSun className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{getWeatherAdvice(searchedWeather)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-3">
            {isDefaultLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="min-h-[116px] animate-pulse rounded-lg bg-gray-50 p-4 ring-1 ring-gray-100"
                  >
                    <div className="h-4 w-20 rounded bg-gray-200" />
                    <div className="mt-5 h-8 w-14 rounded bg-gray-200" />
                    <div className="mt-4 h-3 w-24 rounded bg-gray-200" />
                  </div>
                ))
              : defaultWeather.map((weather) => (
                  <article
                    key={`${weather.city}-${weather.country ?? "city"}`}
                    className="min-h-[116px] rounded-lg bg-gray-50 p-4 ring-1 ring-gray-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {formatLocation(weather)}
                        </h3>
                        <p className="mt-2 text-3xl font-semibold tracking-normal text-gray-900">
                          {weather.temperature}°
                        </p>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={weather.iconUrl}
                        alt={weather.description}
                        className="h-11 w-11 shrink-0"
                      />
                    </div>
                    <p className="mt-3 truncate text-xs font-medium text-gray-500">
                      {weather.description}
                    </p>
                  </article>
                ))}
          </div>

          {defaultError ? (
            <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-800">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{defaultError}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
