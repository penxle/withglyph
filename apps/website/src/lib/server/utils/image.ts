import { PutObjectCommand } from '@aws-sdk/client-s3';
import { renderAsync } from '@resvg/resvg-js';
import got from 'got';
import satori from 'satori';
import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';
import twemoji from 'twemoji';
import fullLogoRaw from '$assets/logos/full.svg?raw';
import { aws } from '$lib/server/external-api';
import { database, Images } from '../database';
import { getDominantColor } from './mmcq';
import type { ImageBounds } from '$lib/utils';

type ImageSource = Buffer | ArrayBuffer | Uint8Array;

const PretendardLight = await got('https://glyph.pub/assets/fonts/Pretendard-Light.otf').buffer();
const PretendardRegular = await got('https://glyph.pub/assets/fonts/Pretendard-Regular.otf').buffer();
const RIDIBatang = await got('https://glyph.pub/assets/fonts/RIDIBatang.otf').buffer();

const KoPubWorldDotumLight = await got('https://glyph.pub/assets/fonts/KoPubWorldDotumLight.otf').buffer();
const KoPubWorldBatangMedium = await got('https://glyph.pub/assets/fonts/KoPubWorldBatangMedium.otf').buffer();

export const finalizeImage = async (source: ImageSource, bounds?: ImageBounds) => {
  let image = sharp(source, { failOn: 'none', animated: true });
  let singleImage = sharp(source, { failOn: 'none' });

  image = image.rotate();
  singleImage = singleImage.rotate();

  if (bounds) {
    image = image.extract(bounds);
    singleImage = singleImage.extract(bounds);
  }

  const getOutput = async () => {
    return await image.clone().toBuffer();
  };

  const getMetadata = async () => {
    return await image.clone().metadata();
  };

  const getColor = async () => {
    const buffer = await singleImage.clone().raw().toBuffer();
    return getDominantColor(buffer);
  };

  const getPlaceholder = async () => {
    const {
      data: raw,
      info: { width, height },
    } = await singleImage
      .clone()
      .resize({
        width: 100,
        height: 100,
        fit: 'inside',
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hash = rgbaToThumbHash(width, height, raw);
    return Buffer.from(hash).toString('base64');
  };

  const getHash = async () => {
    const size = 16;

    const raw = await singleImage
      .clone()
      .greyscale()
      .resize({
        width: size + 1,
        height: size,
        fit: 'fill',
      })
      .raw()
      .toBuffer();

    let difference = '';
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const left = raw[row * (size + 1) + col];
        const right = raw[row * (size + 1) + col + 1];
        difference += left < right ? 1 : 0;
      }
    }

    let hash = '';
    for (let i = 0; i < difference.length; i += 4) {
      const chunk = difference.slice(i, i + 4);
      hash += Number.parseInt(chunk, 2).toString(16);
    }

    return hash;
  };

  const [output, metadata, color, placeholder, hash] = await Promise.all([
    getOutput(),
    getMetadata(),
    getColor(),
    getPlaceholder(),
    getHash(),
  ]);

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  return {
    buffer: output,
    format: metadata.format!,
    size: metadata.size!,
    width: metadata.width!,
    height: metadata.pageHeight ?? metadata.height!,
    color,
    placeholder,
    hash,
  };
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
};

type DirectUploadImageParams = {
  userId?: string;
  name: string;
  source: ImageSource;
  bounds?: ImageBounds;
};
export const directUploadImage = async ({ userId, name, source, bounds }: DirectUploadImageParams) => {
  const res = await finalizeImage(source, bounds);

  const key = aws.createS3ObjectKey('images');
  const ext = res.format;
  const path = `${key}.${ext}`;

  await aws.s3.send(
    new PutObjectCommand({
      Bucket: 'penxle-data',
      Key: path,
      Body: res.buffer,
      ContentType: `image/${res.format}`,
    }),
  );

  const [image] = await database
    .insert(Images)
    .values({
      userId,
      name,
      format: `image/${res.format}`,
      size: res.size,
      width: res.width,
      height: res.height,
      path,
      color: res.color,
      placeholder: res.placeholder,
      hash: res.hash,
    })
    .returning({ id: Images.id });

  return image.id;
};

type GeneratePostFragmentImageParams = {
  title: string;
  space: string;
  body: string;
  font: string;
  size: string;
  color: string;
  background: string;
};
export const generatePostShareImage = async ({
  title,
  space,
  body,
  font,
  size,
  color,
  background,
}: GeneratePostFragmentImageParams) => {
  const logoUrl = `data:image/svg+xml,${encodeURIComponent(fullLogoRaw)}`.replace('currentColor', color);

  const isSansSerif = font === 'Pretendard';

  const svg = await satori(
    {
      type: 'div',
      props: {
        children: [
          {
            type: 'div',
            props: {
              children: body,
              style: {
                display: 'block',
                fontFamily: `${font}, ${isSansSerif ? 'KoPubWorldDotum' : 'KoPubWorldBatang'}`,
                fontSize: size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px',
                // lineHeight: font === 'RIDIBatang' ? '2.215' : '1.875', // 30px for Pretendard, 34px for RIDIBatang
                lineHeight: font === 'RIDIBatang' ? '34px' : '30px', // 30px for Pretendard, 34px for RIDIBatang
                wordBreak: 'break-all',
                lineClamp: 5,
              },
            },
          },
          {
            type: 'div',
            props: {
              children: [
                {
                  type: 'div',
                  props: {
                    children: title,
                    style: {
                      display: 'block',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      lineHeight: '30px',
                      fontWeight: 300,
                      opacity: 0.6,
                      wordBreak: 'break-all',
                      lineClamp: 1,
                    },
                  },
                },
                {
                  type: 'div',
                  props: {
                    children: space,
                    style: {
                      display: 'block',
                      fontFamily: 'Pretendard',
                      fontSize: '13px',
                      lineHeight: '20px',
                      fontWeight: 300,
                      opacity: 0.36,
                      wordBreak: 'break-all',
                      lineClamp: 1,
                    },
                  },
                },
              ],
              style: {
                display: 'flex',
                flexDirection: 'column',
              },
            },
          },
          {
            type: 'img',
            props: {
              src: logoUrl,
              height: 12,
              style: {
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                opacity: 0.2,
              },
            },
          },
        ],
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          height: '100%',
          padding: '48px 24px 80px 24px',
          backgroundColor: background,
          color,
        },
      },
    },
    {
      width: 335,
      height: 335,
      fonts: [
        { name: 'Pretendard', data: PretendardLight, weight: 300, style: 'normal' },
        { name: 'Pretendard', data: PretendardRegular, weight: 400, style: 'normal' },
        { name: 'RIDIBatang', data: RIDIBatang, weight: 400, style: 'normal' },
        { name: 'KoPubWorldDotum', data: KoPubWorldDotumLight, weight: 400, style: 'normal' },
        { name: 'KoPubWorldBatang', data: KoPubWorldBatangMedium, weight: 400, style: 'normal' },
      ],
      loadAdditionalAsset: async (code, segment) => {
        if (code === 'emoji') {
          const codepoint = twemoji.convert.toCodePoint(segment);
          const svg = await got(`https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoint}.svg`).text();
          return 'data:image/svg+xml,' + encodeURIComponent(svg);
        }

        return [];
      },
    },
  );

  const img = await renderAsync(svg, {
    imageRendering: 0,
    shapeRendering: 2,
    textRendering: 1,
    font: { loadSystemFonts: false },
    fitTo: { mode: 'width', value: 1024 },
  });

  return img.asPng();
};
