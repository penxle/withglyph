import IconAlignJustify from '~icons/glyph/align-justify';
import IconAlignCenter from '~icons/tabler/align-center';
import IconAlignLeft from '~icons/tabler/align-left';
import IconAlignRight from '~icons/tabler/align-right';
import IconList from '~icons/tabler/list';
import IconListNumbers from '~icons/tabler/list-numbers';

export const values = {
  defaultColor: '#09090B',

  fontFamily: [
    { label: '프리텐다드', value: 'Pretendard' },
    { label: '나눔바른고딕', value: 'NanumBarunGothic' },
    { label: 'KoPubWorld 돋움', value: 'KoPubWorldDotum' },
    { label: '리디바탕', value: 'RIDIBatang' },
    { label: 'KoPubWorld 바탕', value: 'KoPubWorldBatang' },
    { label: '나눔명조', value: 'NanumMyeongjo' },
  ],

  fontSize: [
    { label: '8pt', value: 8 },
    { label: '10pt', value: 10 },
    { label: '12pt', value: 12 },
    { label: '14pt', value: 14 },
    { label: '16pt', value: 16 },
    { label: '18pt', value: 18 },
    { label: '20pt', value: 20 },
    { label: '22pt', value: 22 },
    { label: '24pt', value: 24 },
    { label: '36pt', value: 36 },
    { label: '48pt', value: 48 },
    { label: '60pt', value: 60 },
    { label: '72pt', value: 72 },
  ],

  lineHeight: [
    { label: '80%', value: 0.8 },
    { label: '100%', value: 1 },
    { label: '120%', value: 1.2 },
    { label: '140%', value: 1.4 },
    { label: '160%', value: 1.6 },
    { label: '180%', value: 1.8 },
    { label: '200%', value: 2 },
    { label: '220%', value: 2.2 },
  ],

  letterSpacing: [
    { label: '-10%', value: -0.1 },
    { label: '-5%', value: -0.05 },
    { label: '0%', value: 0 },
    { label: '5%', value: 0.05 },
    { label: '10%', value: 0.1 },
    { label: '20%', value: 0.2 },
    { label: '40%', value: 0.4 },
  ],

  textAlign: [
    { label: '왼쪽', value: 'left', icon: IconAlignLeft },
    { label: '중앙', value: 'center', icon: IconAlignCenter },
    { label: '오른쪽', value: 'right', icon: IconAlignRight },
    { label: '양쪽', value: 'justify', icon: IconAlignJustify },
  ],

  list: [
    {
      label: '순서 없는 목록',
      value: 'bullet_list',
      icon: IconList,
    },
    {
      label: '순서 있는 목록',
      value: 'ordered_list',
      icon: IconListNumbers,
    },
  ],

  horizontalRule: [
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 },
    { value: 5 },
    { value: 6 },
    { value: 7 },
    { value: 8 },
  ],

  blockquote: [{ value: 1 }, { value: 2 }, { value: 3 }],

  documentParagraphIndent: [
    { label: '없음', value: 0 },
    { label: '0.5칸', value: 0.5 },
    { label: '1칸', value: 1 },
    { label: '2칸', value: 2 },
  ],

  documentParagraphSpacing: [
    { label: '없음', value: 0 },
    { label: '0.5줄', value: 0.5 },
    { label: '1줄', value: 1 },
    { label: '2줄', value: 2 },
  ],
} as const;
