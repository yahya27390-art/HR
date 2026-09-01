// Unified Company Profile & Logo Helper for Green Arrow HR
export const DEFAULT_COMPANY_PROFILE = {
  name: 'Green Arrow HR',
  legal_name: 'شركة درة السيارة لقطع غيار السيارات',
  name_ar: 'شركة درة السيارة لقطع غيار السيارات',
  name_en: 'DORAT AL-SAYARAH TRADING CO.',
  cr_number: '7016475555',
  tax_number: '311861381500003',
  phone: '+966 54 169 7999',
  address: 'المملكة العربية السعودية',
  logo_url: '/company-logo.svg'
};

export function getCompanyProfile() {
  try {
    const saved = localStorage.getItem('hr_flow_company_profile') || localStorage.getItem('company_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      // If logo is old green arrow, upgrade to new DC logo
      const logo = (!parsed.logo_url || parsed.logo_url === '/green-arrow-logo.png')
        ? '/company-logo.svg'
        : parsed.logo_url;

      return {
        ...DEFAULT_COMPANY_PROFILE,
        ...parsed,
        name_ar: parsed.legal_name || parsed.name_ar || parsed.name || DEFAULT_COMPANY_PROFILE.name_ar,
        name_en: parsed.name_en || DEFAULT_COMPANY_PROFILE.name_en,
        cr_number: parsed.cr_number || DEFAULT_COMPANY_PROFILE.cr_number,
        tax_number: parsed.tax_number || DEFAULT_COMPANY_PROFILE.tax_number,
        logo_url: logo
      };
    }
  } catch (e) {}

  return { ...DEFAULT_COMPANY_PROFILE };
}

export function saveCompanyProfile(profile) {
  try {
    const merged = { ...getCompanyProfile(), ...profile };
    localStorage.setItem('hr_flow_company_profile', JSON.stringify(merged));
    localStorage.setItem('company_profile', JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));
    return merged;
  } catch (e) {
    return profile;
  }
}
