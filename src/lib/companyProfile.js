import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Unified Company Profile & Logo Helper for Green Arrow HR
export const DEFAULT_COMPANY_PROFILE = {
  name: 'درة السيارة',
  legal_name: 'شركة درة السيارة لقطع غيار السيارات',
  name_ar: 'شركة درة السيارة لقطع غيار السيارات',
  name_en: 'DORAT AL-SAYARAH TRADING CO.',
  cr_number: '7016475555',
  tax_number: '311861381500003',
  phone: '+966 54 169 7999',
  address: 'المملكة العربية السعودية',
  logo_url: '/company-logo.png'
};

export function getCompanyProfile() {
  try {
    const saved = localStorage.getItem('hr_flow_company_profile') || localStorage.getItem('company_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      const isOldLogo = !parsed.logo_url || 
        parsed.logo_url === '/green-arrow-logo.png' || 
        parsed.logo_url === '/company-logo.svg' || 
        parsed.logo_url === '/dorat-cars-logo.svg';

      const logo = isOldLogo ? '/company-logo.png' : parsed.logo_url;

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

/**
 * Fetch company profile from cloud database and sync to localStorage
 */
export async function fetchCloudCompanyProfile() {
  try {
    const companies = await base44.entities.Company.list();
    if (companies && companies.length > 0) {
      const comp = companies[0];
      const merged = {
        ...DEFAULT_COMPANY_PROFILE,
        name: comp.name || DEFAULT_COMPANY_PROFILE.name,
        name_ar: comp.name || comp.legal_name || DEFAULT_COMPANY_PROFILE.name_ar,
        name_en: comp.name_en || DEFAULT_COMPANY_PROFILE.name_en,
        legal_name: comp.legal_name || comp.name || DEFAULT_COMPANY_PROFILE.legal_name,
        cr_number: comp.cr_number || DEFAULT_COMPANY_PROFILE.cr_number,
        tax_number: comp.tax_number || DEFAULT_COMPANY_PROFILE.tax_number,
        phone: comp.phone || DEFAULT_COMPANY_PROFILE.phone,
        address: comp.address || DEFAULT_COMPANY_PROFILE.address,
        logo_url: comp.logo_url || comp.logo || DEFAULT_COMPANY_PROFILE.logo_url
      };
      localStorage.setItem('hr_flow_company_profile', JSON.stringify(merged));
      localStorage.setItem('company_profile', JSON.stringify(merged));
      window.dispatchEvent(new Event('storage'));
      return merged;
    }
  } catch (e) {
    console.warn('Could not fetch cloud company profile:', e);
  }
  return getCompanyProfile();
}

/**
 * Save company profile locally and sync to cloud database
 */
export async function saveCompanyProfile(profile) {
  try {
    const merged = { ...getCompanyProfile(), ...profile };
    localStorage.setItem('hr_flow_company_profile', JSON.stringify(merged));
    localStorage.setItem('company_profile', JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));

    // Sync to Base44 / Cloud DB asynchronously
    try {
      const companies = await base44.entities.Company.list();
      if (companies && companies.length > 0) {
        await base44.entities.Company.update(companies[0].id, {
          ...companies[0],
          name: profile.name_ar || profile.name || DEFAULT_COMPANY_PROFILE.name_ar,
          legal_name: profile.legal_name || profile.name_ar || DEFAULT_COMPANY_PROFILE.legal_name,
          name_en: profile.name_en || DEFAULT_COMPANY_PROFILE.name_en,
          cr_number: profile.cr_number || DEFAULT_COMPANY_PROFILE.cr_number,
          tax_number: profile.tax_number || DEFAULT_COMPANY_PROFILE.tax_number,
          phone: profile.phone || DEFAULT_COMPANY_PROFILE.phone,
          address: profile.address || DEFAULT_COMPANY_PROFILE.address,
          logo_url: profile.logo_url || DEFAULT_COMPANY_PROFILE.logo_url
        });
      } else {
        await base44.entities.Company.create({
          id: 'comp_1',
          name: profile.name_ar || profile.name || DEFAULT_COMPANY_PROFILE.name_ar,
          legal_name: profile.legal_name || profile.name_ar || DEFAULT_COMPANY_PROFILE.legal_name,
          name_en: profile.name_en || DEFAULT_COMPANY_PROFILE.name_en,
          cr_number: profile.cr_number || DEFAULT_COMPANY_PROFILE.cr_number,
          tax_number: profile.tax_number || DEFAULT_COMPANY_PROFILE.tax_number,
          phone: profile.phone || DEFAULT_COMPANY_PROFILE.phone,
          address: profile.address || DEFAULT_COMPANY_PROFILE.address,
          logo_url: profile.logo_url || DEFAULT_COMPANY_PROFILE.logo_url
        });
      }
    } catch (dbErr) {
      console.warn('DB sync company profile error:', dbErr);
    }

    return merged;
  } catch (e) {
    return profile;
  }
}

/**
 * React hook to always have real-time synchronized company profile & logo
 */
export function useCompanyProfile() {
  const [profile, setProfile] = useState(() => getCompanyProfile());

  useEffect(() => {
    // Initial fetch from cloud
    fetchCloudCompanyProfile().then(p => {
      if (p) setProfile(p);
    });

    const handleStorage = () => {
      setProfile(getCompanyProfile());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    profile,
    updateProfile: saveCompanyProfile,
    refreshProfile: fetchCloudCompanyProfile
  };
}
