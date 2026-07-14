# Classroom Q&A Picker - Completed 🚀

The Classroom Q&A Picker has been successfully built! Here's a breakdown of the completed features and the tech stack used.

## 🏗️ Architecture & Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion for smooth transitions and suspense
- **Database & Auth**: Supabase

## ✨ Features Implemented

### 1. Dashboard & Selection Engine
The core of the app. It uses a fair selection algorithm (Fisher-Yates shuffle) that ensures no student is picked twice in the same cycle. 
- Features a premium Glassmorphism design and glowing aesthetics.
- Includes a 2-second suspense animation (`FlickerSpinner`) before revealing the student.
- Automatically increments the cycle and reshuffles when all active students have been picked.
- Shows the last 5 selections in a clean side panel.

### 2. Roster Management (Students Page)
A real-time data table showing all students.
- You can mark students as **Present** or **Absent** with a single click.
- Absent students are automatically skipped during the selection process without interrupting the flow.

### 3. History Page
A complete log of every selection ever made.
- Shows timestamp, cycle number, roll number, and name.
- Useful for auditing or reviewing past classes.

### 4. Settings & CSV Upload
- **Upload Roster**: Teachers can upload a CSV file with `roll_no` and `name` columns.
- **Danger Zone**: 
  - Reset the current cycle (starts over without deleting history).
  - Clear all history permanently.

### 5. Secure Authentication
- A secure login portal powered by Supabase.
- Only the teacher with the correct credentials can access and manage the app.

## 🚀 Deployment
I have set up a GitHub Actions workflow in `.github/workflows/deploy.yml` that will automatically build and deploy the app to GitHub Pages whenever you push to the `main` or `master` branch.

All secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) need to be added to your GitHub repository secrets for the action to build successfully.

## ✅ Next Steps for You
1. Add the Supabase credentials to your GitHub repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Push this repository to GitHub.
3. Your app will be live on GitHub Pages!

Enjoy your new premium Classroom Q&A Picker!
