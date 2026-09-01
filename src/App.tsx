import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Practice from "./pages/Practice";
import Question from "./pages/Question";
import Playground from "./pages/Playground";
import ProgressPage from "./pages/ProgressPage";
import PdfLibrary from "./pages/pdf/PdfLibrary";
import PdfPractice from "./pages/pdf/PdfPractice";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/practice/:questionId" element={<Question />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/pdf" element={<PdfLibrary />} />
          <Route path="/pdf/:setId" element={<PdfPractice />} />
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
