import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import MobileEmployeeProfileCard from '@/components/MobileEmployeeProfileCard';

export default function Profile() {
  const { user } = useAuth();
  const { employee } = useCurrentEmployee();

  const resolvedEmployee = employee || user || {
    full_name: 'يحيي محمد عبدالغفار باشا',
    employee_number: '1022',
    job_title: 'مدير الموارد البشرية',
    department: 'الموارد البشرية والشؤون الإدارية',
    branch_name: 'الفرع الرئيسي • بريدة',
    phone: '0555139031',
    email: 'yahya9031@gmail.com',
    national_id: '1113348641',
    nationality: 'مصري',
    birth_date: '1992-06-17',
    hire_date: '2016-01-03',
    basic_salary: 8500,
    blood_type: 'O+',
    gender: 'ذكر',
    religion: 'الإسلام',
    iban: 'SA44 8000 0123 6080 1000 9999',
    status: 'active'
  };

  return (
    <div className="w-full max-w-xl mx-auto pb-24 pt-1 sm:pt-4 px-0 sm:px-4" dir="rtl">
      <MobileEmployeeProfileCard employee={resolvedEmployee} />
    </div>
  );
}