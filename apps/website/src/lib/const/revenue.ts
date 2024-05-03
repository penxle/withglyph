import type { RevenueWithdrawalState } from '$lib/enums';

export const banks: Record<string, string> = {
  '090': '카카오뱅크',
  '092': '토스',
  '088': '신한은행',
  '004': 'KB국민은행',
  '020': '우리은행',
  '081': '하나은행',
  '003': '기업은행',
  '071': '우체국',
  '012': '농축협',
  '011': 'NH농협은행',
  '002': '산업은행',
  '007': '수협은행',
  '023': 'SC제일은행',
  '089': '케이뱅크',
  '027': '한국씨티은행',
  '031': '대구은행',
  '032': '부산은행',
  '034': '광주은행',
  '035': '제주은행',
  '037': '전북은행',
  '039': '경남은행',
  '045': '새마을금고',
  '048': '신협',
  '050': '상호저축은행',
};

export const revenueWithdrawalState: Record<RevenueWithdrawalState, string> = {
  FAILED: '지급실패',
  PENDING: '대기중',
  SUCCESS: '출금완료',
};
