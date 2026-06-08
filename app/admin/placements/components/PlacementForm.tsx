"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { ImageUp, Plus } from "lucide-react";
import { createPlacement } from "@/app/actions/placements";
import type { PlatformPlacementLocation } from "@/lib/types";

const placementLocations: PlatformPlacementLocation[] = [
  "announcement_bar",
  "hero_banner",
  "in_feed_ad"
];

const locationLabels: Record<PlatformPlacementLocation, string> = {
  announcement_bar: "頂部公告列",
  hero_banner: "首頁 Hero Banner",
  in_feed_ad: "資訊流廣告"
};

function PreviewBox({
  location,
  title,
  subtitle,
  buttonText,
  previewImage,
  isMarquee,
  marqueeSpeed
}: {
  location: PlatformPlacementLocation;
  title: string;
  subtitle: string;
  buttonText: string;
  previewImage: string | null;
  isMarquee: boolean;
  marqueeSpeed: number;
}) {
  const displayTitle = title || "版位標題預覽";
  const displaySubtitle = subtitle || "副標題會顯示在這裡";
  const displayButtonText = buttonText || "立即查看";

  if (location === "hero_banner") {
    return (
      <div
        className="relative min-h-56 overflow-hidden rounded-lg bg-slate-900 bg-cover bg-center p-6 text-white"
        style={{
          backgroundImage: previewImage ? `url('${previewImage}')` : undefined
        }}
      >
        <div className="absolute inset-0 bg-slate-950/45" aria-hidden="true" />
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
            Hero Banner
          </p>
          <h3 className="mt-4 text-3xl font-semibold tracking-normal">
            {displayTitle}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/80">{displaySubtitle}</p>
          <span className="mt-5 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">
            {displayButtonText}
          </span>
        </div>
      </div>
    );
  }

  if (location === "in_feed_ad") {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        {previewImage ? (
          <div
            className="h-40 bg-cover bg-center"
            style={{ backgroundImage: `url('${previewImage}')` }}
            aria-hidden="true"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-slate-100 text-sm text-slate-400">
            廣告圖片預覽
          </div>
        )}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
            In-feed Ad
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">{displayTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{displaySubtitle}</p>
          <span className="mt-4 inline-flex text-sm font-semibold text-cyan-700">
            {displayButtonText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <div
        className={isMarquee ? "animate-custom-marquee" : "flex items-center justify-center gap-2"}
        style={isMarquee ? { animation: `marquee ${marqueeSpeed}s linear infinite` } : {}}
      >
        <span className="font-medium">{displayTitle}</span>
        <span className="font-semibold underline-offset-4">{displayButtonText}</span>
      </div>
    </div>
  );
}

export default function PlacementForm() {
  const [location, setLocation] =
    useState<PlatformPlacementLocation>("announcement_bar");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeSpeed, setMarqueeSpeed] = useState(15);

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setPreviewImage((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Plus className="h-4 w-4 text-cyan-700" aria-hidden="true" />
        <h2 className="font-semibold text-slate-900">新增版位</h2>
      </div>
      <form action={createPlacement}>
        <div className="grid gap-4 lg:grid-cols-6">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            位置
            <select
              name="location"
              value={location}
              onChange={(event) =>
                setLocation(event.target.value as PlatformPlacementLocation)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              required
            >
              {placementLocations.map((placementLocation) => (
                <option key={placementLocation} value={placementLocation}>
                  {locationLabels[placementLocation]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
            標題
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
            副標題
            <input
              name="subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            排序
            <input
              name="sort_order"
              type="number"
              defaultValue={0}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
            圖片
            <input
              name="image_file"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
            連結 URL
            <input
              name="link_url"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            按鈕文字
            <input
              name="link_text"
              value={buttonText}
              onChange={(event) => setButtonText(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
              <input
                name="is_active"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              啟用
            </label>
          </div>
          <div className="flex items-end gap-4 lg:col-span-2">
            <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
              <input
                name="is_marquee"
                type="checkbox"
                checked={isMarquee}
                onChange={(event) => setIsMarquee(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              啟用跑馬燈
            </label>
            {isMarquee ? (
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                滾動一圈所需秒數
                <input
                  name="marquee_speed"
                  type="number"
                  min={1}
                  value={marqueeSpeed}
                  onChange={(event) => setMarqueeSpeed(Number(event.target.value) || 15)}
                  className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
            ) : null}
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              新增版位
            </button>
          </div>
        </div>

        <div className="mt-8 border rounded-lg p-4 bg-gray-50">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ImageUp className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            Live Preview
          </div>
          <PreviewBox
            location={location}
            title={title}
            subtitle={subtitle}
            buttonText={buttonText}
            previewImage={previewImage}
            isMarquee={isMarquee}
            marqueeSpeed={marqueeSpeed}
          />
        </div>
      </form>
    </section>
  );
}
