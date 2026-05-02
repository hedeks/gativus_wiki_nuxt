export function pickPayloadLabel(
  lang: string,
  o: { label_en: string; label_ru?: string; label_zh?: string },
): string {
  if (lang === 'ru')
    return o.label_ru ?? o.label_en
  if (lang === 'zh')
    return o.label_zh ?? o.label_en
  return o.label_en
}

export function pickPayloadText(
  lang: string,
  o: { title_en: string; title_ru?: string; title_zh?: string },
): string {
  if (lang === 'ru')
    return o.title_ru ?? o.title_en
  if (lang === 'zh')
    return o.title_zh ?? o.title_en
  return o.title_en
}

export function pickPayloadDesc(
  lang: string,
  o: { desc_en: string; desc_ru?: string; desc_zh?: string },
): string {
  if (lang === 'ru')
    return o.desc_ru ?? o.desc_en
  if (lang === 'zh')
    return o.desc_zh ?? o.desc_en
  return o.desc_en
}
