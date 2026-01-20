import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import {
  Calendar,
  BookOpen,
  FileText,
  Clock,
  Settings,
  CheckSquare,
  TrendingUp,
  Trash2,
  Edit,
  X,
  Menu,
} from "lucide-react";
import { Routes, Route, useLocation } from "react-router-dom";

//layouts//
import CourseLayout from "./layout/courselayout.jsx"
import Quiz from "./layout/quiz-layout.jsx"
import AuthPage from "./Authentication/AuthPage.jsx"
import LandingPage from "./Authentication/LandingPage.jsx"
import Dashboard from "./layout/dashboard-layout/dashboard-layout.jsx"
import CalendarPage from "./layout/calendar-layout/calendar-layout.jsx"
import AssignmentsPage from "./layout/assignment-page-layout/assignment-page-lauout.jsx"
import StudyTimerPage from "./layout/timer-layout/timer-layout.jsx"
import AISyllabusParser from "./layout/ai-parser-layout/ai-parse-layout.jsx"
import CoursesPage from "./layout/course-page-layout.jsx"

import axios from "axios";
const NoteCanvas = lazy(() => import("./layout/note-layout/NoteCanvas.jsx"));

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SESSION_TYPES = ["lecture", "lab", "tutorial"];
const WEEKDAY_TO_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
const INDEX_TO_WEEKDAY = Object.fromEntries(Object.entries(WEEKDAY_TO_INDEX).map(([day, idx]) => [idx, day]));
const courseColorPalette = ["purple", "blue", "pink", "green", "orange"];

const generateTemporaryCourseId = () => `course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeCourse = (course) => {
  if (!course) return null;
  const resolvedId =
    course.id ??
    course._id ??
    course.course_id ??
    course.courseId ??
    course.code ??
    course.course_code ??
    generateTemporaryCourseId();
  const resolvedCode = course.code ?? course.course_code ?? course.courseName ?? "Course";
  const resolvedName = course.name ?? course.course_name ?? resolvedCode;
  return {
    ...course,
    id: String(resolvedId),
    _id: course._id ?? String(resolvedId),
    code: resolvedCode,
    name: resolvedName,
    instructor: course.instructor ?? course.instructor_name ?? "TBD",
    credits:
      typeof course.credits === "number"
        ? course.credits
        : Number(course.credit ?? course.credits ?? 0) || 0,
    semester: course.semester ?? course.term ?? "TBD",
    description: course.description ?? "",
    color: course.color ?? courseColorPalette[0],
  };
};

const normalizeCourses = (list) => (Array.isArray(list) ? list.map((course) => normalizeCourse(course)).filter(Boolean) : []);

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const DASHBOARD_DEFAULT_STATE = Object.freeze({
  courses: [],
  assignments: [],
  classes: [],
  notebooks: [],
  studySessions: [],
});

const generatePlaceholderPassword = () => Math.random().toString(36).slice(-10) + Date.now().toString(36);

const formatUserForClient = (userDoc, overrides = {}) => {
  if (!userDoc) return null;
  return {
    ...userDoc,
    ...overrides,
    name: overrides.name ?? userDoc.username ?? userDoc.name ?? userDoc.email?.split("@")[0] ?? "Student",
    email: overrides.email ?? userDoc.email ?? "",
  };
};

const parseISODate = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};
/**
 * StudyHubApp (responsive + functional)
 * - No horizontal overflow (w-screen + overflow-x-hidden)
 * - Mobile drawer sidebar (toggle)
 * - Desktop sticky sidebar (md+)
 * - Buttons wired: navigate, add items, export .ics, save notes, timer start/stop
 */
const StudyHubApp = () => {
  const location = useLocation();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [user, setUser] = useState(null);
  const userId = user?._id ?? user?.id ?? user?.user_id ?? null;
  const [authError, setAuthError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const isGoogleConfigured = Boolean(googleClientId);
  const displayUser =
    user ??
    {
      name: "Guest Student",
      email: isGoogleConfigured ? "Sign in to personalize StudyHub" : "Set VITE_GOOGLE_CLIENT_ID to enable Google login",
    };
  const avatarInitial = (displayUser.name?.[0] ?? "S").toUpperCase();
  const [authScreen, setAuthScreen] = useState("landing"); // landing | login | signup
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", rememberMe: false });
  const [authLoading, setAuthLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState("");
  const [stateHydrated, setStateHydrated] = useState(false);
  

  const handleAuthInput = (e) => {
    const { name, type, checked, value } = e.target;
    setAuthForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value, }));
  };

  const fetchUserByEmail = useCallback(async (email) => {
    const response = await axios.get(`${API_BASE_URL}/api/user/email/${encodeURIComponent(email)}`);
    return response.data;
  }, []);

  const ensureUserRecord = useCallback(
    async ({ name, email }) => {
      if (!email) {
        throw new Error("Email is required");
      }
      try {
        return await fetchUserByEmail(email);
      } catch (error) {
        if (error.response?.status === 404) {
          const payload = {
            username: name || email.split("@")[0],
            email,
            pswd_hash: generatePlaceholderPassword(),
          };
          const createResponse = await axios.post(`${API_BASE_URL}/api/user`, payload);
          return createResponse.data;
        }
        throw error;
      }
    },
    [fetchUserByEmail]
  );

  const login_cache_key = "study_key"
    
  const saveLoginCache = (user) => {
    localStorage.setItem(login_cache_key, JSON.stringify({user, ts:Date.now()}));
  };

  const loadLoginCache = () => {
    const raw = localStorage.getItem(login_cache_key);
    if(!raw)return null;
    try{
      const {user, ts} = JSON.parse(raw);
      return user;
    }catch{
      return null;
    }
  };
  useEffect(() => {
      const cachedUser = loadLoginCache();
      if (cachedUser) {
        setUser(cachedUser);
        setAuthScreen("dashboard");
      }
    },[]);

  const handleManualAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!authForm.email || !authForm.password || (authScreen === "signup" && !authForm.name)) {
      setAuthError("Please fill in all required fields.");
      return;
    }
    setAuthLoading(true);
    try {
      let response;
      if (authScreen === "signup") {
        const newUserPayload = {
          username: authForm.name,
          email: authForm.email,
          pswd_hash: authForm.password,
        };
        response = await axios.post(`${API_BASE_URL}/api/user`, newUserPayload);
      } else {
        response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: authForm.email,
          password: authForm.password,
        });
      }
      const savedUser = formatUserForClient(response.data);
      setUser(savedUser);
      if(authForm.rememberMe == true){
        saveLoginCache(savedUser)
      }
      setAuthForm({ name: "", email: "", password: "", rememberMe: false });
      setAuthScreen("landing");
    } catch (error) {
      console.error("Authentication error:", error);
      const fallback = authScreen === "signup" ? "Registration failed." : "Invalid email or password.";
      setAuthError(error.response?.data?.error ?? fallback);
    } finally {
      setAuthLoading(false);
    }
  };


  // ----- DATA -----
  const [courses, setCourses] = useState([]);

  const [assignments, setAssignments] = useState([]);

  const [classes, setClasses] = useState([]);

  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [courseForm, setCourseForm] = useState({
    code: "",
    name: "",
    instructor: "",
    credits: "3",
    semester: "Fall 2024",
    description: "",
    color: courseColorPalette[0],
  });
  const [editingCourseId, setEditingCourseId] = useState(null);
  const courseFormRef = useRef(null);

  const [classForm, setClassForm] = useState({
    courseId: courses[0]?.id ?? "",
    type: "lecture",
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "10:00",
    location: "",
  });

  

  const [holidays, setHolidays] = useState([]);
  const [holidayError, setHolidayError] = useState("");
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  const [notebooks, setNotebooks] = useState([]);

  const [studySessions, setStudySessions] = useState([]);

  const [timerState, setTimerState] = useState({
    isRunning: false,
    seconds: 0,
    selectedCourse: null,
  });

  const applyDashboardState = useCallback(
    (snapshot = DASHBOARD_DEFAULT_STATE) => {
      setCourses(Array.isArray(snapshot.courses) ? normalizeCourses(snapshot.courses) : []);
      setAssignments(Array.isArray(snapshot.assignments) ? snapshot.assignments : []);
      setClasses(Array.isArray(snapshot.classes) ? snapshot.classes : []);
      setNotebooks(Array.isArray(snapshot.notebooks) ? snapshot.notebooks : []);
      setStudySessions(Array.isArray(snapshot.studySessions) ? snapshot.studySessions : []);
    },
    []
  );

  const resetDashboardState = useCallback(() => {
    applyDashboardState(DASHBOARD_DEFAULT_STATE);
  }, [applyDashboardState]);

  const fetchDashboardState = useCallback(
    async (targetUserId) => {
      setStateLoading(true);
      setStateError("");
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/dashboard-state/${targetUserId}`);
        applyDashboardState(data?.data ?? DASHBOARD_DEFAULT_STATE);
      } catch (error) {
        if (error.response?.status === 404) {
          resetDashboardState();
        } else {
          console.error("Failed to load dashboard state:", error);
          setStateError("Couldn't load your saved data. Changes are stored locally only.");
          resetDashboardState();
        }
      } finally {
        setStateLoading(false);
        setStateHydrated(true);
      }
    },
    [applyDashboardState, resetDashboardState]
  );

  const persistDashboardState = useCallback(
    async (snapshot) => {
      if (!userId) return;
      try {
        await axios.post(`${API_BASE_URL}/api/dashboard-state`, {
          userId,
          data: snapshot,
        });
        setStateError("");
      } catch (error) {
        console.error("Failed to save dashboard state:", error);
        setStateError("Unable to save changes. We'll keep trying automatically.");
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) {
      resetDashboardState();
      setStateError("");
      setStateHydrated(false);
      return;
    }
    fetchDashboardState(userId);
  }, [userId, fetchDashboardState, resetDashboardState]);

  useEffect(() => {
    if (!userId || !stateHydrated) return;
    const snapshot = {
      courses,
      assignments,
      classes,
      notebooks,
      studySessions,
    };
    persistDashboardState(snapshot);
  }, [courses, assignments, classes, notebooks, studySessions, userId, stateHydrated, persistDashboardState]);

  const decodeCredential = (credential) => {
    try {
      const payload = credential.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded =
        typeof window === "undefined"
          ? Buffer.from(base64, "base64").toString("binary")
          : window.atob(base64);
      return JSON.parse(decodeURIComponent(decoded.split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
    } catch {
      return null;
    }
  };

  const handleCredentialResponse = async (response) => {
    setAuthError("");
    const profile = decodeCredential(response.credential);
    if (!profile?.email) {
      setAuthError("Unable to read Google profile. Please try again.");
      return;
    }
    try {
      const syncedUser = await ensureUserRecord({
        name: profile.name,
        email: profile.email,
      });
      const hydratedUser = formatUserForClient(syncedUser, {
        name: profile.name ?? syncedUser?.username,
        picture: profile.picture,
      });
      setUser(hydratedUser);
      if (typeof window !== "undefined") {
        window.google?.accounts.id?.disableAutoSelect?.();
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      setAuthError("Unable to complete Google sign-in. Please try again.");
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setAuthError("");
    resetDashboardState();
    setStateHydrated(false);
    if (typeof window !== "undefined") {
      window.google?.accounts.id?.disableAutoSelect?.();
    }
  };

  useEffect(() => {
    if (!googleClientId) return;
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      setGoogleReady(true);
      return;
    }
    if (typeof document === "undefined") return;
    setIsGoogleLoading(true);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleLoading(false);
      setGoogleReady(true);
    };
    script.onerror = () => {
      setIsGoogleLoading(false);
      setAuthError("Failed to load Google sign-in. Check your network and client ID.");
    };
    document.head.appendChild(script);
    return () => {
      script.onload = null;
      script.onerror = null;
      if (typeof document !== "undefined" && document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [googleClientId]);

  useEffect(() => {
    if (!googleReady || !googleClientId || user) return;
    if (typeof window === "undefined") return;
    const google = window.google;
    if (!google?.accounts?.id) return;
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredentialResponse,
      auto_select: false,
      ux_mode: "popup",
    });
    if (googleButtonRef.current) {
      googleButtonRef.current.innerHTML = "";
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        width: 260,
      });
    }
  }, [googleReady, googleClientId, user, authScreen]);

  useEffect(() => {
    if (!user?._id) return;
    const loadCourses = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/course/user/${user._id}`);
        setCourses(normalizeCourses(res.data));
      } catch (err) {
        console.error("Failed to load courses", err);
      }
    };

    loadCourses();
  }, [user]);


  /*useEffect(() => {
    if (courses.length === 0) {
      setClassForm((prev) => ({ ...prev, courseId: "" }));
      setAssignmentForm((prev) => ({ ...prev, courseId: "" }));
      return;
    }
    setClassForm((prev) => {
      if (prev.courseId && courses.some((course) => course.id === prev.courseId)) {
        return prev;
      }
      return { ...prev, courseId: courses[0].id };
    });
    setAssignmentForm((prev) => {
      if (prev.courseId && courses.some((course) => course.id === prev.courseId)) {
        return prev;
      }
      return { ...prev, courseId: courses[0].id };
    });
  }, [courses]);*/

  useEffect(() => {
    const controller = new AbortController();
    const fetchHolidays = async () => {
      try {
        setHolidaysLoading(true);
        setHolidayError("");
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${calendarYear}/NG`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Failed to fetch holidays");
        }
        const data = await response.json();
        setHolidays(data);
      } catch (error) {
        if (error.name === "AbortError") return;
        setHolidayError("Unable to load Nigerian public holidays right now.");
        setHolidays([]);
      } finally {
        setHolidaysLoading(false);
      }
    };

    fetchHolidays();

    return () => controller.abort();
  }, [calendarYear]);

  // ----- DERIVED STATS -----
  const upcomingAssignments = assignments.filter(
    (a) => a.status === "not_started" || a.status === "in_progress"
  ).length;
  const overdueAssignments = assignments.filter((a) => a.status === "overdue").length;
  const completedAssignments = assignments.filter((a) => a.status === "completed").length;   
  const totalStudyTime = studySessions.reduce((acc, s) => acc + s.duration, 0);
  const completionRate =
    assignments.length > 0
      ? Math.round((completedAssignments / assignments.length) * 100)
      : 0;

  // ----- ACTIONS -----
  const resetCourseForm = () => {
    setCourseForm({
      code: "",
      name: "",
      instructor: "",
      credits: "3",
      semester: "Fall 2024",
      description: "",
      color: courseColorPalette[courses.length % courseColorPalette.length] ?? courseColorPalette[0],
    });
    setEditingCourseId(null);
  };

  const handleCourseInputChange = (e) => {
    const { name, value } = e.target;
    setCourseForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCourseSubmit = (e) => {
    e.preventDefault();
    if (!courseForm.code.trim() || !courseForm.name.trim()) {
      alert("Course code and name are required.");
      return;
    }
    const payload = {
      id: editingCourseId ?? Date.now().toString(),
      code: courseForm.code.trim(),
      name: courseForm.name.trim(),
      instructor: courseForm.instructor.trim() || "TBD",
      credits: Number(courseForm.credits) || 0,
      semester: courseForm.semester.trim() || "TBD",
      description: courseForm.description.trim(),
      color: courseForm.color,
    };
    const normalizedPayload = normalizeCourse(payload);
    setCourses((prev) =>
      editingCourseId
        ? prev.map((c) => (c.id === editingCourseId ? normalizedPayload : c))
        : [normalizedPayload, ...prev]
    );
    resetCourseForm();
  };

  const handleCourseCreatedFromForm = useCallback(
    (newCourse) => {
      const normalized = normalizeCourse(newCourse);
      if (!normalized) return;
      setCourses((prev) => [normalized, ...prev]);
    },
    [setCourses]
  );

  const handleEditCourse = (course) => {
    setEditingCourseId(course.id);
    setCourseForm({
      code: course.code,
      name: course.name,
      instructor: course.instructor,
      credits: String(course.credits ?? ""),
      semester: course.semester ?? "",
      description: course.description ?? "",
      color: course.color,
    });
    courseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDeleteCourse = async (course) => {
    try {
      const backendId = course?._id ?? course?.id;
      if (!backendId) {
        console.error("Cannot remove course without an identifier.");
        return;
      }
      await axios.delete(`${API_BASE_URL}/api/course/${backendId}`);
      setCourses((prev) => prev.filter((item) => item.id !== (course.id ?? backendId)));
      if (editingCourseId === (course.id ?? backendId)) {
        resetCourseForm();
      }
    } catch (error) {
      console.log("Cannot remove the selected course", error);
    }
  };



  const handleAddCourse = () => {
    setCurrentPage("courses");
    setTimeout(() => {
      courseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // ----- NAV + LAYOUT -----
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "assignments", label: "Assignments", icon: CheckSquare },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "timer", label: "Study Timer", icon: Clock },
    { id: "syllabus", label: "AI Syllabus Parser", icon: Settings },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard 
          courses={courses} 
          //handleAddAssignment={handleAddAssignment} 
          //handleAddClass={handleAddClass} 
          handleAddCourse={handleAddCourse}/>;
      case "courses":
        return <CoursesPage 
          courses={courses}
          user={user}
          courseColorPalette={courseColorPalette}
          courseFormRef={courseFormRef}
          editingCourseId={editingCourseId}
          resetCourseForm={resetCourseForm}
          handleCourseCreatedFromForm={handleCourseCreatedFromForm}
          handleDeleteCourse={handleDeleteCourse}
          handleEditCourse={handleEditCourse}
          handleAddCourse={handleAddCourse}
          setSelectedCourse={setSelectedCourse}
          setCurrentPage={setCurrentPage}/>;
      case "calendar":
        return <CalendarPage 
          WEEK_DAYS={WEEK_DAYS} 
          calendarYear={calendarYear} 
          setCalendarYear={setCalendarYear} 
          calendarMonth={calendarMonth} 
          setCalendarMonth={setCalendarMonth} 
          WEEKDAY_TO_INDEX={WEEKDAY_TO_INDEX} 
          holidays={holidays} 
          parseISODate={parseISODate} 
          INDEX_TO_WEEKDAY={INDEX_TO_WEEKDAY} 
          holidaysLoading={holidaysLoading} 
          holidayError={holidayError} 
          classes={classes}
          courses={courses}
          classForm={classForm}
          setClassForm={setClassForm}
          SESSION_TYPES={SESSION_TYPES}/>;
      case "assignments":
        return <AssignmentsPage 
          assignments={assignments}
        courses={courses}
        upcomingAssignments={upcomingAssignments}
        overdueAssignments={overdueAssignments}
        completedAssignments={completedAssignments}
        completionRate={completionRate}
        setAssignments={setAssignments}/>;
      case "notes":
        return user ? (
          <Suspense fallback={<div className="p-6 bg-white rounded-xl shadow-sm">Loading notes...</div>}>
            <NoteCanvas userId={userId} />
          </Suspense>
        ) : (
          <div className="p-6 bg-white rounded-xl shadow-sm text-gray-700">
            Please sign in to access the notes workspace.
          </div>
        );
      case "timer":
        return <StudyTimerPage 
          timerState={timerState}
          setTimerState={setTimerState}
          studySessions={studySessions}
          setStudySessions={setStudySessions}
          courses={courses}/>;
      case "syllabus":
        return <AISyllabusParser 
          courses={courses}
          setAssignments={setAssignments}/>;
      case "courseLayout":
        return <CourseLayout course={selectedCourse} />; //pass the course obj to the component//
      default:
        return <Dashboard />;
    }
  };

  //redirect to landing page//
  if (!user) {
    if (authScreen === "landing") {
      return <LandingPage setAuthScreen={setAuthScreen} />;
    }
    return <AuthPage   authScreen={authScreen}
    setAuthScreen={setAuthScreen}
    authForm={authForm}
    handleAuthInput={handleAuthInput}
    authLoading={authLoading}
    handleManualAuth={handleManualAuth}
    googleReady={googleReady}
    isGoogleLoading={isGoogleLoading}
    googleButtonRef={googleButtonRef}/>;
  }

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-gray-50 text-gray-900">
      {/* Top bar (mobile) */}
      <div className="md:hidden sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          aria-label="Open menu"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold">StudyHub</span>
        </div>
        <div className="w-8" />
      </div>

      <div className="flex">
        {/* Sidebar (drawer on mobile, sticky on desktop) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r border-gray-200 transition-transform md:static md:translate-x-0 md:h-screen ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">StudyHub</h1>
                <p className="text-xs text-gray-500">Your Academic Companion</p>
              </div>
            </div>
            <button
              aria-label="Close menu"
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${active ? "text-blue-600" : "text-gray-500"}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 hidden md:block">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold">
                {avatarInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayUser.name}</p>
                <p className="text-xs text-gray-500 truncate">{displayUser.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full md:ml-4 lg:ml-6">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6 space-y-3">
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{authError}</div>
              )}
              {stateLoading && userId && (
                <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-lg px-4 py-2">
                  Loading your saved study data…
                </div>
              )}
              {stateError && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-2">{stateError}</div>
              )}
              {isGoogleConfigured ? (
                user ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-lg">
                          {(user.name?.[0] ?? "S").toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Signed in as</p>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="self-start sm:self-auto border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-dashed border-gray-300 rounded-xl p-4">
                    <div>
                      <p className="font-semibold text-gray-900">Sign in with Google</p>
                      <p className="text-sm text-gray-600">
                        Connect your Google account to sync schedules and personalize StudyHub.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div ref={googleButtonRef} />
                      {(!googleReady || isGoogleLoading) && <span className="text-sm text-gray-500">Loading…</span>}
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl p-4">
                  <p className="font-semibold mb-1">Google OAuth is not configured</p>
                  <p>
                    Add <code className="bg-white px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to your environment (see README)
                    to enable Google sign-in.
                  </p>
                </div>
              )}
            </div>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudyHubApp;
