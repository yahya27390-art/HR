-- ============================================================================
-- SUPABASE CLOUD MASTER SETUP SCRIPT FOR HR DORAT CARS
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/omnvdvmmmarwsobadlsb/sql/new
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_name TEXT,
    cr_number TEXT,
    tax_number TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    company_id TEXT,
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    manager_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. JOB TITLES
CREATE TABLE IF NOT EXISTS public.job_titles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SHIFTS
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    start_time TEXT,
    end_time TEXT,
    break_start TEXT,
    break_end TEXT,
    working_hours NUMERIC,
    total_hours NUMERIC,
    grace_minutes INT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LEAVE POLICIES
CREATE TABLE IF NOT EXISTS public.leave_policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    annual_days INT,
    compensatory_days INT DEFAULT 0,
    umrah_days INT DEFAULT 0,
    sick_days INT DEFAULT 0,
    emergency_days INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. EMPLOYEES (MAIN TABLE)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    employee_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    department_name TEXT,
    branch_name TEXT,
    shift TEXT,
    manager_name TEXT,
    nationality TEXT,
    national_id TEXT,
    id_expiry_date TEXT,
    birth_date TEXT,
    join_date TEXT,
    salary NUMERIC DEFAULT 0,
    housing_allowance NUMERIC DEFAULT 0,
    transport_allowance NUMERIC DEFAULT 0,
    leave_policy TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. EMPLOYMENT CONTRACTS
CREATE TABLE IF NOT EXISTS public.employment_contracts (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    employee_name TEXT,
    contract_type TEXT DEFAULT 'full_time',
    start_date TEXT,
    end_date TEXT,
    basic_salary NUMERIC,
    housing_allowance NUMERIC DEFAULT 0,
    transport_allowance NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    employee_name TEXT,
    log_date TEXT,
    check_in TEXT,
    check_out TEXT,
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    employee_name TEXT,
    leave_type TEXT,
    start_date TEXT,
    end_date TEXT,
    days_count INT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    date TEXT,
    content TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for straightforward Public Anon Access (or enable with policy)
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;

-- SEED 18 DORA CARS EMPLOYEES
INSERT INTO public.employees (id, employee_number, full_name, email, phone, job_title, department_name, branch_name, shift, nationality, national_id, join_date, salary, housing_allowance, transport_allowance, leave_policy, status)
VALUES
('emp_1001', '1001', 'فهد ناصر محمد الجوعي', 'dortalsiarh@gmail.com', '966541697999', 'المدير العام', 'مكتب الإدارة', 'مكتب الإدارة', 'شفت المدير العام', 'سعودي', '1111738496', '2022-11-01', 4000, 0, 0, 'الاجازة السنوية', 'active'),
('emp_1022', '1022', 'يحيي محمد عبدالغفار باشا', 'yahya9031@gmail.com', '966575901487', 'مصمم و مسئول الموارد البشرية', 'مكتب الإدارة', 'مكتب الإدارة', 'فترة عمل غير سعودي', 'مصري', '2554901666', '2025-01-01', 4000, 200, 0, 'الاجازة السنوية', 'active'),
('emp_1005', '1005', 'هشام ابوالفضل زغلول', 'hes.ham42@yahoo.com', '966542070313', 'مدير الحسابات', 'مكتب الإدارة', 'مكتب الإدارة', 'فترة عمل غير سعودي', 'مصري', '2406494993', '2022-11-01', 5500, 150, 150, 'الاجازة السنوية', 'active'),
('emp_1034', '1034', 'طه محمود المحيميد', 'taha141318@gmail.com', '966507437337', 'مسئول متجر الكتروني', 'مكتب الإدارة', 'مكتب الإدارة', 'فترة عمل غير سعودي', 'سوري', '', '2026-04-13', 1500, 0, 0, 'اجازات بدون مرتب', 'active'),
('emp_1002', '1002', 'محمود طه المحيميد', 'ma-h77@hotmail.com', '966542070313', 'بائع قطع غيار', 'الفرع الرئيسي', 'الفرع الرئيسي', 'فترة عمل غير سعودي', 'سوري', '2151595283', '2022-11-01', 4200, 150, 150, 'الاجازة السنوية', 'active'),
('emp_1004', '1004', 'صالح علي المحيميد', 'salehali.e@gmail.com', '966542821253', 'بائع قطع غيار', 'فرع كيا ( السليم )', 'فرع كيا ( السليم )', 'فترة عمل سعودي صباحي', 'سعودي', '1106501065', '2022-11-01', 4000, 0, 0, 'الاجازة السنوية', 'active'),
('emp_1008', '1008', 'خالد ناصر محمد الجوعي', 'khaled@gmail.com', '966544439321', 'بائع قطع غيار', 'الفرع الرئيسي', 'الفرع الرئيسي', 'فترة عمل سعودي صباحي', 'سعودي', '1111738488', '2023-02-01', 3300, 0, 0, 'الاجازة السنوية', 'active'),
('emp_1011', '1011', 'عبد العزيز ناصر محمد الجوعي', 'azooz7998@gmail.com', '966553601195', 'بائع قطع غيار', 'فرع هونداي ( الرواف )', 'فرع هونداي ( الرواف )', 'فترة عمل سعودي صباحي', 'سعودي', '1113348641', '2023-05-23', 2500, 0, 0, 'اجازات بدون مرتب', 'active'),
('emp_1013', '1013', 'وضاح صالح سالم أحمد العولقي', 'abosaleh7830@gmail.com', '966549107830', 'بائع قطع غيار', 'فرع هونداي ( الرواف )', 'فرع هونداي ( الرواف )', 'فترة عمل غير سعودي', 'يمني', '2539519401', '2023-11-18', 2500, 200, 200, 'Standard Policy', 'active'),
('emp_1017', '1017', 'محمد سالم صالح أحمد المردم', 'mmha1998man@gmail.com', '966532343471', 'بائع قطع غيار', 'فرع كيا ( السليم )', 'فرع كيا ( السليم )', 'فترة عمل غير سعودي', 'يمني', '2541925349', '2024-09-24', 2000, 200, 100, 'الاجازة السنوية', 'active'),
('emp_1018', '1018', 'عاصم ابراهيم الرياعي', 'abosa4er33@hotmail.com', '966505873004', 'بائع قطع غيار', 'فرع هونداي ( الرواف )', 'فرع هونداي ( الرواف )', 'فترة عمل سعودي مسائي', 'سعودي', '1129098602', '2026-02-12', 1800, 0, 0, 'اجازات بدون مرتب', 'active'),
('emp_1020', '1020', 'عبد الله يحيى إبراهيم التويجري', 'abodytw26@icloud.com', '966534063653', 'بائع قطع غيار', 'فرع هونداي ( الرواف )', 'فرع هونداي ( الرواف )', 'فترة عمل سعودي صباحي', 'سعودي', '1118862547', '2024-10-12', 3000, 0, 0, 'الاجازة السنوية', 'active'),
('emp_1021', '1021', 'إبراهيم عبد العزيز التويجري', 'ab0790468@gmail.com', '966554460559', 'بائع قطع غيار', 'فرع كيا ( السليم )', 'فرع كيا ( السليم )', 'فترة عمل سعودي مسائي', 'سعودي', '1116885797', '2026-02-15', 1800, 0, 0, 'اجازات بدون مرتب', 'active'),
('emp_1024', '1024', 'سفيان عبد الرحمن الضالع', 'sfyan5401@gmail.com', '966501801811', 'بائع قطع غيار', 'فرع هونداي ( الرواف )', 'فرع كيا ( السليم )', 'فترة عمل سعودي مسائي', 'سعودي', '1130465527', '2025-03-01', 1500, 0, 0, 'اجازات بدون مرتب', 'active'),
('emp_1027', '1027', 'محمد صالح محمد السعوي', 'mohammedsa.2005a@gmail.com', '966506189288', 'بائع قطع غيار', 'الفرع الرئيسي', 'الفرع الرئيسي', 'فترة عمل سعودي مسائي', 'سعودي', '1145258602', '2025-09-01', 1500, 0, 0, 'اجازات بدون مرتب', 'active'),
('emp_1032', '1032', 'محمد عادل احمد نعمان', 'mo7781199@gmail.com', '966534063653', 'بائع قطع غيار', 'الفرع الرئيسي', 'الفرع الرئيسي', 'فترة عمل غير سعودي', 'يمني', '2564699011', '2025-12-24', 1500, 200, 0, 'الاجازة السنوية', 'active'),
('emp_1033', '1033', 'عبد الله ناصر عبد الله محمد عمر', 'lkhg964@gmail.com', '966559249379', 'بائع قطع غيار', 'فرع هونداي ( الرواف )', 'فرع هونداي ( الرواف )', 'فترة عمل غير سعودي', 'يمني', '2611459286', '2026-01-18', 1500, 200, 0, 'الاجازة السنوية', 'active'),
('emp_1035', '1035', 'محمدعبد محمد البليهي', '1035@durracars.sa', '966535014657', 'بائع قطع غيار', 'فرع هونداي ( الرواف )', 'فرع هونداي ( الرواف )', 'فترة عمل سعودي مسائي', 'سعودي', '1130729724', '2026-04-15', 1500, 0, 0, 'اجازات بدون مرتب', 'active')
ON CONFLICT (employee_number) DO NOTHING;

-- SEED BRANCHES
INSERT INTO public.branches (id, name, address, phone, is_main)
VALUES
('br_admin', 'مكتب الإدارة', 'طريق الملك فهد، الرياض', '+966541697999', true),
('br_main', 'الفرع الرئيسي', 'الفرع الرئيسي', '+966542070313', false),
('br_kia', 'فرع كيا ( السليم )', 'حي السليم', '+966542821253', false),
('br_hyundai', 'فرع هونداي ( الرواف )', 'حي الرواف', '+966553601195', false)
ON CONFLICT (id) DO NOTHING;
