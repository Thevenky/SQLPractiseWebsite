import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Practice from "./pages/Practice";
import Question from "./pages/Question";
import Playground from "./pages/Playground";
import ProgressPage from "./pages/ProgressPage";
import PdfLibrary from "./pages/pdf/PdfLibrary";
import PdfPractice from "./pages/pdf/PdfPractice";
import { MyDbProvider } from "./mydb/MyDbContext";
import MyDatabasePage from "./pages/mydb/MyDatabasePage";
import MyDbEditorPage from "./pages/mydb/MyDbEditorPage";
import MyDbQuestionsPage from "./pages/mydb/MyDbQuestionsPage";
import MyDbQuestionPracticePage from "./pages/mydb/MyDbQuestionPracticePage";

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
          <Route
            path="/mydb/*"
            element={
              <MyDbProvider>
                <Routes>
                  <Route path="/" element={<MyDatabasePage />} />
                  <Route path="/editor" element={<MyDbEditorPage />} />
                  <Route path="/questions" element={<MyDbQuestionsPage />} />
                  <Route path="/questions/:questionId" element={<MyDbQuestionPracticePage />} />
                </Routes>
              </MyDbProvider>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
