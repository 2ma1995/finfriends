"use client";

import { useState } from "react";

/**
 * 사진 고르기 — 🔴 **보내기 전에 폰에서 줄인다** (2026-09-03 사용자 제보 —
 * 「사진 찍고 «했어요» 를 눌렀는데 오류 페이지가 나와」).
 *
 * 세 값이 서로 안 맞았다.
 *
 *   Server Action 기본 한도   1MB   ← 설정이 없어 기본값이었다
 *   모듈이 받는 사진          5MB
 *   아이 화면이 보내는 것      폰 원본 (보통 2~5MB)
 *
 * 폰 사진이 **서버 코드에 닿기도 전에** 1MB 문턱에서 잘렸다. 그래서 우리가 만든
 * 「사진이 너무 커요」 문구가 뜰 자리조차 없었고, 브라우저 오류 페이지가 나왔다.
 *
 * 🔴 **한도를 올리는 것만으로는 부족하다.** 5MB 를 아이 폰의 느린 회선으로 올리는
 *    동안 아무 표시가 없으면 아이는 「고장 났다」고 본다. 게다가 이 사진은
 *    **부모가 한 번 보고 바로 지운다** — 원본 화질을 지킬 이유가 없다.
 *
 * 🔴 **줄이기가 실패해도 막지 않는다.** 캔버스를 못 쓰는 브라우저가 있고,
 *    사진이 너무 커서 그리다 실패할 수도 있다. 그때는 **원본 그대로 보낸다** —
 *    서버 한도(4MB)와 그 문구가 뒤를 받는다. 연출이 실패해도 길은 남는다.
 */

/** 긴 쪽 1600px · JPEG 0.82 — 부모가 폰으로 보기에 충분하고 대개 300KB 안쪽이다 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;
/** 이보다 작으면 손대지 않는다. 이미 작은 것을 다시 그리면 오히려 커질 수 있다 */
const SKIP_UNDER = 600 * 1024;

async function shrink(file: File): Promise<File | null> {
  try {
    if (!("createImageBitmap" in window)) return null;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    // 🔴 원본이 이미 작으면 그리지 않는다 — 확대는 용량만 늘린다
    if (scale >= 1 && file.size <= SKIP_UNDER) { bitmap.close?.(); return null; }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return null; }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return null;   // 안 줄었으면 원본이 낫다
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export function PhotoPicker({
  required, label, why, notice, working,
}: {
  required: boolean;
  label: string;
  why: string;
  notice: string;
  /** 「사진을 줄이고 있어요」 — 큰 사진은 한 박자 걸린다 */
  working: string;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size <= SKIP_UNDER) return;

    setBusy(true);
    const small = await shrink(file);
    setBusy(false);
    if (!small) return;                       // 🔴 실패하면 원본 그대로 둔다

    try {
      const box = new DataTransfer();
      box.items.add(small);
      input.files = box.files;
      setNote(`${Math.round(small.size / 1024)}KB`);
    } catch {
      // DataTransfer 를 못 쓰는 브라우저 — 원본 그대로 간다
    }
  };

  return (
    <label className="grid gap-1">
      <span className={`text-cap ${required ? "font-bold text-ink" : "text-ink-mute"}`}>{label}</span>
      {/*
        🔴 `accept` 를 `image/*` 로 둔다. MIME 을 하나하나 적으면
           **iOS 사파리가 「사진 찍기」를 안 띄운다** — 파일 고르기만 나온다.
        🔴 `required` 는 걸지 않는다 (D66). 막는 것은 서버이고, 아이 말로 답한다.
      */}
      <input type="file" name="photo" accept="image/*" onChange={onChange}
             className={`min-h-touch w-full rounded-card border bg-surface px-2 py-2 text-cap ${
               required ? "border-primary" : "border-line"}`} />
      {busy ? <span className="text-cap font-bold text-primary-d">{working}</span> : null}
      {note ? <span className="text-cap text-ink-mute">{note}</span> : null}
      <span className="text-cap text-ink-mute">{why}</span>
      <span className="text-cap text-ink-mute">{notice}</span>
    </label>
  );
}
