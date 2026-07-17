const fs = require('fs');
const content = fs.readFileSync('D:\\rcss\\.misc\\all_2026_students_list_with_gender_fixed.csv', 'utf8');
const lines = content.split('\n').filter(l => l.trim() !== '');
let sql = 'ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;\n\n';
for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 8) {
        const id = parts[0];
        const gender = parts[7];
        if (id && gender) {
            sql += `UPDATE public.students SET gender = '${gender}' WHERE id = '${id}';\n`;
        }
    }
}
fs.writeFileSync('C:/Users/Me/.gemini/antigravity/brain/bca069e2-ef8f-40be-a5ad-17078b4c904d/supabase_gender_script_v2.sql', sql);
console.log('SQL generated!');
