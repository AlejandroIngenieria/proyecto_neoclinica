import os
import re

files_to_process = [
    r"app\dashboard\[expCodigo]\page.tsx",
    r"components\doctor-reviews.tsx"
]

replacements = {
    'bg-[#F9FAFB]': 'bg-slate-50',
    'text-[#111827]': 'text-slate-900',
    'text-[#374151]': 'text-slate-700',
    'text-[#6B7280]': 'text-slate-500',
    'text-[#9CA3AF]': 'text-slate-400',
    'border-[#E5E7EB]': 'border-slate-200',
    'border-[#D1D5DB]': 'border-slate-300 dark:border-slate-600',
    'divide-[#E5E7EB]': 'divide-slate-200 dark:divide-slate-700',
}

for filepath in files_to_process:
    full_path = os.path.join(r"c:\Users\Alejandro\Desktop\Proyecto real\NeoClinica\NeoClinicaFrontend\proyecto_neoclinica", filepath)
    if not os.path.exists(full_path):
        print(f"Not found: {full_path}")
        continue
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replacements done.")
