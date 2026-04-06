import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminIndex from "./pages/admin/AdminIndex";
import AdminExam from "./pages/admin/AdminExam";
import VideoUpload from "./pages/admin/VideoUpload";
import AdminTrainingVideos from "./pages/admin/AdminTrainingVideos";
import AdminResults from "./pages/admin/AdminResults";
import AdminStudents from "./pages/admin/AdminStudents";

import StudentIndex from "./pages/student/StudentIndex";
import StudentVideos from "./pages/student/StudentVideos";
import StudentTrainingVideos from "./pages/student/StudentTrainingVideos";
import StudentExam from "./pages/student/StudentExam";
import StudentResults from "./pages/student/StudentResults";     // ← Real Results Page
import StudentProfile from "./pages/student/StudentProfile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ====================== ADMIN ROUTES ====================== */}
        <Route path="/admin" element={<AdminIndex />} />
        <Route path="/admin/videos" element={<VideoUpload />} />
        <Route path="/admin/training-videos" element={<AdminTrainingVideos />} />
        <Route path="/admin/exam" element={<AdminExam />} />
        <Route path="/admin/results" element={<AdminResults />} />
        <Route path="/admin/students" element={<AdminStudents />} />

        {/* ====================== STUDENT ROUTES ====================== */}
        <Route path="/student" element={<StudentIndex />} />
        <Route path="/student/videos" element={<StudentVideos />} />
        <Route path="/student/training-videos" element={<StudentTrainingVideos />} />
        <Route path="/student/exam" element={<StudentExam />} />
        
        {/* ✅ Real Results Page */}
        <Route path="/student/results" element={<StudentResults />} />        <Route path="/student/profile" element={<StudentProfile />} />
        {/* Default Route */}
        <Route path="/" element={<AdminIndex />} />
      </Routes>
    </BrowserRouter>
  );
}