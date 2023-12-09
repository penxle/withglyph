import dayjs from 'dayjs';

export const isAdulthood = (birthday: Date) => {
  const birthYear = dayjs(birthday).kst().year();
  const currentYear = dayjs.kst().year();

  const koreanAge = currentYear - birthYear + 1;

  return koreanAge >= 20;
};