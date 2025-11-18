import { BookOpen, CheckSquare, CalendarDays, TrendingUp} from "lucide-react";

export default function LandingPage({ setAuthScreen }) {
  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="uppercase tracking-wide text-sm text-blue-200">StudyHub</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Stay organized, conquer deadlines, and study smarter.
          </h1>

          <p className="text-lg text-slate-200 mb-8">
            StudyHub centralizes your courses, schedule, assignments, and notes so you always know what&apos;s next.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setAuthScreen("signup")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Get started free
            </button>
            <button
              onClick={() => setAuthScreen("login")}
              className="border border-white/40 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-semibold"
            >
              I already have an account
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold mb-4">What you get</h2>
          <ul className="space-y-4 text-slate-200">
            <li className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-blue-400 mt-1" />
              <p>Automated weekly timetable with exportable calendar events.</p>
            </li>
            <li className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-blue-400 mt-1" />
              <p>Holiday-aware schedule that highlights public holidays.</p>
            </li>
            <li className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400 mt-1" />
              <p>Progress metrics, study timer, AI syllabus parsing, and more.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
