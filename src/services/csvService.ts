import Papa from 'papaparse';
import type { Student } from '../types';

export const parseCSV = (file: File): Promise<Omit<Student, 'id' | 'created_at'>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        
        // Validate columns
        if (data.length > 0 && !('course' in data[0])) {
          return reject(new Error('CSV must contain a "course" column.'));
        }
        if (data.length > 0 && !('name' in data[0])) {
          return reject(new Error('CSV must contain a "name" column.'));
        }

        const students: Omit<Student, 'id' | 'created_at'>[] = [];
        const courses = new Set<string>();

        for (const row of data) {
          const course = String(row.course).trim();
          const name = String(row.name).trim();

          if (!course || !name) continue;

          // Note: duplicate course + name combination might be possible? We might not want to reject on duplicate course, as many students might be in the same course.
          // Wait, the original code used roll_no as unique identifier. 
          // If we replace it with 'course', we can have multiple students in the same course. So we shouldn't reject on duplicate 'course'.
          // Let's modify the CSV to just push the student without course uniqueness checking.

          students.push({
            course,
            name,
            present: true,
          });
        }

        resolve(students);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
