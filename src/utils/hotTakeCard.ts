import type { ShortUpdate } from "@/types/firestore";
import { formatRelativeTime } from "@/utils/formatRelativeTime";

const CARD_SIZE = 1080;

/** Wraps text to fit a max width, returning an array of lines. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the attached image"));
    img.src = url;
  });
}

/**
 * Draws a branded, shareable card for a hot take onto an off-screen
 * canvas and returns it as a PNG Blob - styled like a screenshot of a
 * tweet, but DG-branded (green checkmark, gradient avatar, dark glass
 * aesthetic) rather than an actual X/Twitter screenshot.
 */
export async function generateHotTakeCardBlob(update: ShortUpdate): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser");

  const PAD = 72;

  // Background
  ctx.fillStyle = "#0B0F19";
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  // Ambient glow mesh (matches the site's real background treatment)
  const glow1 = ctx.createRadialGradient(220, 180, 0, 220, 180, 500);
  glow1.addColorStop(0, "rgba(0,230,118,0.18)");
  glow1.addColorStop(1, "rgba(0,230,118,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  const glow2 = ctx.createRadialGradient(900, 700, 0, 900, 700, 500);
  glow2.addColorStop(0, "rgba(59,130,246,0.14)");
  glow2.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  let cursorY = PAD + 8;

  // Avatar circle with gradient fill
  const avatarR = 42;
  const avatarX = PAD + avatarR;
  const avatarY = cursorY + avatarR;
  const avatarGrad = ctx.createLinearGradient(
    avatarX - avatarR,
    avatarY - avatarR,
    avatarX + avatarR,
    avatarY + avatarR
  );
  avatarGrad.addColorStop(0, "rgba(0,230,118,0.35)");
  avatarGrad.addColorStop(1, "rgba(59,130,246,0.35)");
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  ctx.fillStyle = avatarGrad;
  ctx.fill();
  ctx.fillStyle = "#00E676";
  ctx.font = "700 30px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DG", avatarX, avatarY + 2);

  // Small verified badge on the avatar
  ctx.beginPath();
  ctx.arc(avatarX + avatarR - 8, avatarY + avatarR - 8, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#0B0F19";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(avatarX + avatarR - 8, avatarY + avatarR - 8, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#00E676";
  ctx.fill();

  // Name + timestamp
  ctx.textAlign = "left";
  ctx.font = "600 32px 'Inter', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("DG Tribune", avatarX + avatarR + 20, avatarY - 10);
  ctx.font = "400 26px 'Inter', sans-serif";
  ctx.fillStyle = "#AAB4C8";
  ctx.fillText(formatRelativeTime(update.createdAt), avatarX + avatarR + 20, avatarY + 24);

  cursorY = avatarY + avatarR + 56;

  // Hot take text, wrapped
  ctx.font = "500 44px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  const lines = wrapText(ctx, update.text, CARD_SIZE - PAD * 2);
  const lineHeight = 58;
  for (const line of lines) {
    cursorY += lineHeight;
    ctx.fillText(line, PAD, cursorY);
  }
  cursorY += 40;

  // Attached image, if present - cropped to a fixed box, top-anchored
  if (update.imageUrl) {
    try {
      const img = await loadImage(update.imageUrl);
      const boxW = CARD_SIZE - PAD * 2;
      const boxH = Math.min(420, CARD_SIZE - cursorY - 180);
      if (boxH > 100) {
        const scale = Math.max(boxW / img.width, boxH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (boxW - drawW) / 2;

        ctx.save();
        const radius = 24;
        ctx.beginPath();
        ctx.roundRect(PAD, cursorY, boxW, boxH, radius);
        ctx.clip();
        ctx.drawImage(img, PAD + offsetX, cursorY, drawW, drawH);
        ctx.restore();
        cursorY += boxH + 40;
      }
    } catch {
      // Image failed to load (CORS or network) - card still renders
      // fine without it, just as text.
    }
  }

  // Footer: like count + DG Tribune wordmark
  const footerY = CARD_SIZE - 64;
  ctx.font = "500 30px 'Inter', sans-serif";
  ctx.fillStyle = "#AAB4C8";
  ctx.fillText(`❤ ${update.likeCount.toLocaleString()}`, PAD, footerY);

  ctx.textAlign = "right";
  ctx.font = "700 30px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "#00E676";
  ctx.fillText("DG TRIBUNE", CARD_SIZE - PAD, footerY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn't generate the image"));
    }, "image/png");
  });
}

/** Generates the card and triggers a real file download. */
export async function downloadHotTakeCard(update: ShortUpdate): Promise<void> {
  const blob = await generateHotTakeCardBlob(update);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dg-tribune-hot-take-${update.slug}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
