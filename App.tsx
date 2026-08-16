import { loadJsonDatabase, saveJsonDatabase } from "./lib/jsonDatabase";
import { isSupabaseConfigured, supabase, supabasePublishableKey, supabaseUrl } from "./lib/supabase";
import { textbookChapters } from "./sejarahChapters";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar as RNStatusBar,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

type Subject = "Sejarah";
type Priority = "Low" | "Medium" | "High";
type TaskStatus = "Pending" | "Completed";
type Tab = "Home" | "Tasks" | "Learn" | "AI" | "Progress" | "Profile";
type SchoolForm = "Form 1" | "Form 2" | "Form 3" | "Form 4" | "Form 5";
type NoteLanguage = "English" | "Bahasa Melayu" | "Chinese";
type AppLanguage = "English" | "Bahasa Melayu" | "Chinese";
type ThemeMode = "Light" | "Dark";
type Screen =
  | { name: "tabs" }
  | { name: "taskForm"; taskId?: string }
  | { name: "chapter"; chapterId: string }
  | { name: "notes"; chapterId: string }
  | { name: "quiz"; chapterId: string; returnTo?: "tabs" | "chapter" }
  | { name: "result"; attemptId: string; returnTo?: "tabs" | "chapter" }
  | { name: "streak" };

type User = {
  id: string;
  displayName: string;
  email: string;
  form: string;
  appLanguage?: AppLanguage;
  themeMode?: ThemeMode;
  notificationsEnabled: boolean;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate?: string;
  createdAt: string;
};

type HomeworkTask = {
  id: string;
  title: string;
  subject: Subject;
  description: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  proofUri: string;
  createdAt: string;
  completedAt?: string;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Chapter = {
  id: string;
  form: SchoolForm;
  chapterNumber: number;
  title: string;
  description: string;
  notes: Record<NoteLanguage, { heading: string; body: string[] }[]>;
  importantPoints: string[];
  keywords: string[];
  quiz: QuizQuestion[];
};

type QuizAttempt = {
  id: string;
  chapterId: string;
  score: number;
  total: number;
  answers: number[];
  completedAt: string;
};

type DailyActivity = {
  id: string;
  type: "task" | "notes" | "quiz";
  date: string;
  relatedId: string;
};

type UserActivity = {
  id: string;
  type: "signup" | "login" | "logout" | "profile_update" | "task_created" | "task_completed" | "task_deleted" | "notes_completed" | "quiz_completed";
  title: string;
  createdAt: string;
  date: string;
  relatedId?: string;
};

type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  language: NoteLanguage;
};

type AppData = {
  users: User[];
  activeUserId?: string;
  tasksByUser: Record<string, HomeworkTask[]>;
  attemptsByUser: Record<string, QuizAttempt[]>;
  activitiesByUser: Record<string, DailyActivity[]>;
  activityLogsByUser: Record<string, UserActivity[]>;
  completedNotesByUser: Record<string, Record<string, boolean>>;
  aiChatsByUser: Record<string, Record<string, AiChatMessage[]>>;
};

const schoolForms: SchoolForm[] = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5"];
const appLanguages: AppLanguage[] = ["English", "Bahasa Melayu", "Chinese"];
const themeModes: ThemeMode[] = ["Light", "Dark"];
const priorities: Priority[] = ["Low", "Medium", "High"];
const appTabs: Tab[] = ["Home", "Tasks", "Learn", "AI", "Progress", "Profile"];
const AI_TUTOR_URL = supabaseUrl ? `${supabaseUrl}/functions/v1/ai-tutor` : "";
const AI_REQUEST_TIMEOUT_MS = 20_000;
const MAX_AI_QUESTION_LENGTH = 1_000;
const topSafeInset = Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 8;

const translations = {
  English: {
    appTagline: "Multilingual Sejarah notes, quizzes, homework, and daily streaks in one place.",
    createAccount: "Create student account",
    login: "Login",
    displayName: "Display name",
    schoolForm: "School Form",
    email: "Email",
    password: "Password",
    signUp: "Sign up",
    welcomeBack: "Welcome back",
    currentStreak: "Current streak",
    addTask: "Add task",
    startLearning: "Start learning",
    todaysHomework: "Today's homework",
    home: "Home",
    tasks: "Tasks",
    learn: "Learn",
    ai: "AI",
    progress: "Progress",
    profile: "Profile",
    appLanguage: "App language",
    themeMode: "Theme mode",
    settings: "Settings",
    light: "Light",
    dark: "Dark",
    saveProfile: "Save profile",
    logout: "Log out",
    alreadyHaveAccount: "Already have an account? Login",
    needAccount: "Need an account? Sign up",
    activityDoneToday: "Today's study activity is completed.",
    completeActivityToday: "Complete one Sejarah task, note, or quiz today.",
    dueToday: "Due today",
    quizzes: "Quizzes",
    averageScoreShort: "Avg score",
    doneTasks: "Done tasks",
    viewStreakCalendar: "View streak calendar",
    bestStreak: "Best streak",
    view: "View",
    noTaskDueToday: "No pending task due today",
    noTaskDueTodayBody: "Add Sejarah homework or start a chapter quiz to continue your progress.",
    tasksSubtitle: "Track homework, revision, and deadlines.",
    addHomeworkTask: "Add homework task",
    noTasksHere: "No tasks here",
    noTasksBody: "Create a Sejarah task with a title, priority, and due date.",
    noDescription: "No description added.",
    markComplete: "Mark complete",
    edit: "Edit",
    delete: "Delete",
    taskTitle: "Task title",
    subject: "Subject",
    description: "Description",
    dueDate: "Due date",
    priority: "Priority",
    saveTask: "Save task",
    addTaskTitle: "Add task",
    editTaskTitle: "Edit task",
    learnSubtitle: "Your registered Form chapters are shown here. Change Form in Profile settings.",
    notesLanguage: "Notes language",
    progressLabel: "Progress",
    bestQuiz: "Best quiz",
    chooseNotesLanguage: "Choose notes language",
    importantPoints: "Important points",
    keywords: "Keywords",
    quizHistory: "Quiz history",
    startQuiz: "Start quiz",
    noQuizAttempt: "No quiz attempt yet",
    noQuizAttemptBody: "Complete the five-question quiz to record progress.",
    switchLanguage: "Switch language",
    notesCompleted: "Notes completed",
    markNotesCompleted: "Mark notes completed",
    aiSummary: "Gemini material summary",
    aiSummarySubtitle: "Summarize this chapter with Google GenAI for quick revision.",
    generateAiSummary: "Generate AI summary",
    generatingAiSummary: "Generating summary...",
    clearAiSummary: "Clear summary",
    aiSummaryPlaceholder: "Tap the button to generate a short summary, keywords, and review questions from this material.",
    aiSummaryError: "Gemini could not generate a summary. Please check the internet connection or API key.",
    aiTutorChat: "Ask Gemini about this material",
    aiTutorSubtitle: "Your questions and Gemini answers are saved for this chapter.",
    aiPageTitle: "AI Tutor",
    aiPageSubtitle: "Choose a chapter, then ask Gemini based on that chapter material.",
    chooseChapter: "Choose chapter",
    selectedChapter: "Selected chapter",
    askQuestion: "Ask a question",
    askQuestionPlaceholder: "Example: Why was the London Treaty 1824 important?",
    sendQuestion: "Send question",
    askingGemini: "Asking Gemini...",
    noChatYet: "No saved questions yet.",
    clearChat: "Clear chat",
    geminiAnswerError: "Gemini could not answer right now. Please check the internet connection or API key.",
    previous: "Previous",
    next: "Next",
    finishQuiz: "Finish quiz",
    quizResult: "Quiz result",
    score: "Score",
    reviewAnswers: "Review answers",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    retryQuiz: "Retry quiz",
    returnToLearn: "Return to Learn",
    progressSubtitle: "Simple records for tasks, quizzes, and chapter work.",
    current: "Current",
    completedTasks: "Completed tasks",
    chaptersStarted: "Chapters started",
    chaptersCompleted: "Chapters completed",
    openStreakCalendar: "Open streak calendar",
    chapterProgressTitle: "Sejarah chapter progress",
    achievements: "Achievements",
    unlocked: "Unlocked",
    locked: "Locked",
    studyReminders: "Study reminders",
    reminderHelp: "Local notification setting for future reminders.",
    on: "On",
    off: "Off",
    noQuizHistory: "No quiz history",
    noQuizHistoryBody: "Completed quizzes will appear here.",
    accountActivity: "Account activity",
    noAccountActivity: "No activity recorded yet.",
    privacyNote: "Privacy note",
    privacyBody: "This prototype stores account, login, and study activity in a local JSON database on this device for demonstration. A production version should use secure authentication, database rules, and a backend for AI requests.",
    studyStreak: "Study streak",
    streakSubtitle: "One valid activity per day keeps the streak active.",
    validActivities: "Valid activities",
    validTask: "Complete a homework task.",
    validNotes: "Mark a chapter note as completed.",
    validQuiz: "Complete a quiz.",
    appOpenNoCount: "Opening the app does not count toward the streak.",
    learningPath: "Learning path",
    pathSubtitle: "Follow your Form Sejarah path one chapter at a time.",
    dailyGoal: "Daily goal",
    continueLesson: "Continue lesson",
    lessonComplete: "Complete",
    lessonReady: "Ready",
    lessonLocked: "Next lesson",
    lessonPathProgress: "Path progress",
    todaysPath: "Today's path",
    quizCoach: "Study buddy",
    quizTip: "Tip"
  },
  "Bahasa Melayu": {
    appTagline: "Nota Sejarah pelbagai bahasa, kuiz, kerja rumah dan streak harian dalam satu aplikasi.",
    createAccount: "Cipta akaun murid",
    login: "Log masuk",
    displayName: "Nama paparan",
    schoolForm: "Tingkatan",
    email: "E-mel",
    password: "Kata laluan",
    signUp: "Daftar",
    welcomeBack: "Selamat kembali",
    currentStreak: "Streak semasa",
    addTask: "Tambah tugasan",
    startLearning: "Mula belajar",
    todaysHomework: "Kerja rumah hari ini",
    home: "Utama",
    tasks: "Tugasan",
    learn: "Belajar",
    ai: "AI",
    progress: "Kemajuan",
    profile: "Profil",
    appLanguage: "Bahasa aplikasi",
    themeMode: "Mod tema",
    settings: "Tetapan",
    light: "Cerah",
    dark: "Gelap",
    saveProfile: "Simpan profil",
    logout: "Log keluar",
    alreadyHaveAccount: "Sudah ada akaun? Log masuk",
    needAccount: "Perlu akaun? Daftar",
    activityDoneToday: "Aktiviti pembelajaran hari ini sudah lengkap.",
    completeActivityToday: "Lengkapkan satu tugasan, nota atau kuiz Sejarah hari ini.",
    dueToday: "Perlu siap hari ini",
    quizzes: "Kuiz",
    averageScoreShort: "Purata skor",
    doneTasks: "Tugasan siap",
    viewStreakCalendar: "Lihat kalendar streak",
    bestStreak: "Streak terbaik",
    view: "Lihat",
    noTaskDueToday: "Tiada tugasan tertangguh hari ini",
    noTaskDueTodayBody: "Tambah kerja rumah Sejarah atau mula kuiz bab untuk meneruskan kemajuan.",
    tasksSubtitle: "Jejak kerja rumah, ulang kaji dan tarikh akhir.",
    addHomeworkTask: "Tambah tugasan kerja rumah",
    noTasksHere: "Tiada tugasan di sini",
    noTasksBody: "Cipta tugasan Sejarah dengan tajuk, keutamaan dan tarikh akhir.",
    noDescription: "Tiada penerangan ditambah.",
    markComplete: "Tanda siap",
    edit: "Edit",
    delete: "Padam",
    taskTitle: "Tajuk tugasan",
    subject: "Subjek",
    description: "Penerangan",
    dueDate: "Tarikh akhir",
    priority: "Keutamaan",
    saveTask: "Simpan tugasan",
    addTaskTitle: "Tambah tugasan",
    editTaskTitle: "Edit tugasan",
    learnSubtitle: "Bab Tingkatan berdaftar anda dipaparkan di sini. Tukar Tingkatan dalam tetapan Profil.",
    notesLanguage: "Bahasa nota",
    progressLabel: "Kemajuan",
    bestQuiz: "Kuiz terbaik",
    chooseNotesLanguage: "Pilih bahasa nota",
    importantPoints: "Isi penting",
    keywords: "Kata kunci",
    quizHistory: "Sejarah kuiz",
    startQuiz: "Mula kuiz",
    noQuizAttempt: "Belum ada percubaan kuiz",
    noQuizAttemptBody: "Lengkapkan kuiz lima soalan untuk merekod kemajuan.",
    switchLanguage: "Tukar bahasa",
    notesCompleted: "Nota selesai",
    markNotesCompleted: "Tanda nota selesai",
    aiSummary: "Ringkasan bahan Gemini",
    aiSummarySubtitle: "Ringkaskan bab ini dengan Google GenAI untuk ulang kaji pantas.",
    generateAiSummary: "Jana ringkasan AI",
    generatingAiSummary: "Sedang jana ringkasan...",
    clearAiSummary: "Kosongkan ringkasan",
    aiSummaryPlaceholder: "Tekan butang untuk jana ringkasan pendek, kata kunci dan soalan ulang kaji daripada bahan ini.",
    aiSummaryError: "Gemini tidak dapat menjana ringkasan. Sila semak sambungan internet atau API key.",
    aiTutorChat: "Tanya Gemini tentang bahan ini",
    aiTutorSubtitle: "Soalan anda dan jawapan Gemini disimpan untuk bab ini.",
    aiPageTitle: "Tutor AI",
    aiPageSubtitle: "Pilih bab, kemudian tanya Gemini berdasarkan bahan bab tersebut.",
    chooseChapter: "Pilih bab",
    selectedChapter: "Bab dipilih",
    askQuestion: "Tanya soalan",
    askQuestionPlaceholder: "Contoh: Mengapakah Perjanjian London 1824 penting?",
    sendQuestion: "Hantar soalan",
    askingGemini: "Sedang tanya Gemini...",
    noChatYet: "Belum ada soalan tersimpan.",
    clearChat: "Kosongkan chat",
    geminiAnswerError: "Gemini tidak dapat menjawab sekarang. Sila semak sambungan internet atau API key.",
    previous: "Sebelum",
    next: "Seterusnya",
    finishQuiz: "Tamat kuiz",
    quizResult: "Keputusan kuiz",
    score: "Skor",
    reviewAnswers: "Semak jawapan",
    yourAnswer: "Jawapan anda",
    correctAnswer: "Jawapan betul",
    retryQuiz: "Cuba semula kuiz",
    returnToLearn: "Kembali ke Belajar",
    progressSubtitle: "Rekod ringkas untuk tugasan, kuiz dan kerja bab.",
    current: "Semasa",
    completedTasks: "Tugasan siap",
    chaptersStarted: "Bab dimulakan",
    chaptersCompleted: "Bab lengkap",
    openStreakCalendar: "Buka kalendar streak",
    chapterProgressTitle: "Kemajuan bab Sejarah",
    achievements: "Pencapaian",
    unlocked: "Dibuka",
    locked: "Terkunci",
    studyReminders: "Peringatan belajar",
    reminderHelp: "Tetapan notifikasi tempatan untuk peringatan akan datang.",
    on: "Hidup",
    off: "Mati",
    noQuizHistory: "Tiada sejarah kuiz",
    noQuizHistoryBody: "Kuiz yang dilengkapkan akan dipaparkan di sini.",
    accountActivity: "Aktiviti akaun",
    noAccountActivity: "Belum ada aktiviti direkodkan.",
    privacyNote: "Nota privasi",
    privacyBody: "Prototaip ini menyimpan akaun, log masuk dan aktiviti belajar dalam pangkalan data JSON setempat pada peranti ini untuk demonstrasi. Versi sebenar perlu menggunakan pengesahan selamat, peraturan pangkalan data dan backend untuk permintaan AI.",
    studyStreak: "Streak belajar",
    streakSubtitle: "Satu aktiviti sah setiap hari mengekalkan streak.",
    validActivities: "Aktiviti sah",
    validTask: "Lengkapkan tugasan kerja rumah.",
    validNotes: "Tanda nota bab sebagai selesai.",
    validQuiz: "Lengkapkan kuiz.",
    appOpenNoCount: "Membuka aplikasi sahaja tidak dikira dalam streak.",
    learningPath: "Laluan belajar",
    pathSubtitle: "Ikuti laluan Sejarah mengikut Tingkatan anda satu bab demi satu.",
    dailyGoal: "Matlamat harian",
    continueLesson: "Teruskan pelajaran",
    lessonComplete: "Selesai",
    lessonReady: "Sedia",
    lessonLocked: "Pelajaran seterusnya",
    lessonPathProgress: "Kemajuan laluan",
    todaysPath: "Laluan hari ini",
    quizCoach: "Rakan belajar",
    quizTip: "Petua"
  },
  Chinese: {
    appTagline: "多语文历史笔记、测验、功课和每日学习 streak 集于一处。",
    createAccount: "创建学生账号",
    login: "登录",
    displayName: "显示名称",
    schoolForm: "中学年级",
    email: "电邮",
    password: "密码",
    signUp: "注册",
    welcomeBack: "欢迎回来",
    currentStreak: "当前 streak",
    addTask: "添加任务",
    startLearning: "开始学习",
    todaysHomework: "今日功课",
    home: "首页",
    tasks: "任务",
    learn: "学习",
    ai: "AI",
    progress: "进度",
    profile: "个人",
    appLanguage: "应用语言",
    themeMode: "主题模式",
    settings: "设置",
    light: "浅色",
    dark: "深色",
    saveProfile: "保存资料",
    logout: "登出",
    alreadyHaveAccount: "已有账号？登录",
    needAccount: "需要账号？注册",
    activityDoneToday: "今天的学习活动已完成。",
    completeActivityToday: "今天完成一个历史任务、笔记或测验。",
    dueToday: "今日到期",
    quizzes: "测验",
    averageScoreShort: "平均分",
    doneTasks: "已完成任务",
    viewStreakCalendar: "查看 streak 日历",
    bestStreak: "最佳 streak",
    view: "查看",
    noTaskDueToday: "今天没有待完成任务",
    noTaskDueTodayBody: "添加历史功课或开始章节测验以继续进度。",
    tasksSubtitle: "管理功课、复习和截止日期。",
    addHomeworkTask: "添加功课任务",
    noTasksHere: "这里没有任务",
    noTasksBody: "创建包含标题、优先级和截止日期的历史任务。",
    noDescription: "没有添加说明。",
    markComplete: "标记完成",
    edit: "编辑",
    delete: "删除",
    taskTitle: "任务标题",
    subject: "科目",
    description: "说明",
    dueDate: "截止日期",
    priority: "优先级",
    saveTask: "保存任务",
    addTaskTitle: "添加任务",
    editTaskTitle: "编辑任务",
    learnSubtitle: "这里显示你已注册年级的章节。请在个人资料设置更改年级。",
    notesLanguage: "笔记语言",
    progressLabel: "进度",
    bestQuiz: "最佳测验",
    chooseNotesLanguage: "选择笔记语言",
    importantPoints: "重点",
    keywords: "关键词",
    quizHistory: "测验记录",
    startQuiz: "开始测验",
    noQuizAttempt: "还没有测验记录",
    noQuizAttemptBody: "完成五题测验以记录进度。",
    switchLanguage: "切换语言",
    notesCompleted: "笔记已完成",
    markNotesCompleted: "标记笔记完成",
    aiSummary: "Gemini 材料摘要",
    aiSummarySubtitle: "使用 Google GenAI 总结本章，方便快速复习。",
    generateAiSummary: "生成 AI 摘要",
    generatingAiSummary: "正在生成摘要...",
    clearAiSummary: "清除摘要",
    aiSummaryPlaceholder: "点击按钮，从本材料生成简短摘要、关键词和复习问题。",
    aiSummaryError: "Gemini 无法生成摘要。请检查网络连接或 API key。",
    aiTutorChat: "向 Gemini 询问本材料",
    aiTutorSubtitle: "你的问题和 Gemini 回答会保存在本章。",
    aiPageTitle: "AI 导师",
    aiPageSubtitle: "选择章节后，根据该章节内容向 Gemini 提问。",
    chooseChapter: "选择章节",
    selectedChapter: "已选章节",
    askQuestion: "提出问题",
    askQuestionPlaceholder: "例：为什么《1824年伦敦条约》很重要？",
    sendQuestion: "发送问题",
    askingGemini: "正在询问 Gemini...",
    noChatYet: "还没有保存的问题。",
    clearChat: "清除聊天",
    geminiAnswerError: "Gemini 现在无法回答。请检查网络连接或 API key。",
    previous: "上一题",
    next: "下一题",
    finishQuiz: "完成测验",
    quizResult: "测验结果",
    score: "分数",
    reviewAnswers: "检查答案",
    yourAnswer: "你的答案",
    correctAnswer: "正确答案",
    retryQuiz: "重做测验",
    returnToLearn: "返回学习",
    progressSubtitle: "查看任务、测验和章节进度记录。",
    current: "当前",
    completedTasks: "已完成任务",
    chaptersStarted: "已开始章节",
    chaptersCompleted: "已完成章节",
    openStreakCalendar: "打开 streak 日历",
    chapterProgressTitle: "历史章节进度",
    achievements: "成就",
    unlocked: "已解锁",
    locked: "未解锁",
    studyReminders: "学习提醒",
    reminderHelp: "未来本地通知提醒设置。",
    on: "开启",
    off: "关闭",
    noQuizHistory: "没有测验记录",
    noQuizHistoryBody: "完成的测验会显示在这里。",
    accountActivity: "账号活动",
    noAccountActivity: "还没有记录任何活动。",
    privacyNote: "隐私说明",
    privacyBody: "此原型把账号、登录和学习活动储存在本设备的本地 JSON 数据库中作为演示。正式版本应使用安全身份验证、数据库规则和后端处理 AI 请求。",
    studyStreak: "学习 streak",
    streakSubtitle: "每天完成一个有效活动即可保持 streak。",
    validActivities: "有效活动",
    validTask: "完成一个功课任务。",
    validNotes: "标记章节笔记为完成。",
    validQuiz: "完成一个测验。",
    appOpenNoCount: "只打开应用不会计算进 streak。",
    learningPath: "\u5b66\u4e60\u8def\u5f84",
    pathSubtitle: "\u6309\u7167\u4f60\u7684\u4e2d\u5b66\u5e74\u7ea7\uff0c\u4e00\u7ae0\u4e00\u7ae0\u5b8c\u6210 Sejarah \u8bfe\u7a0b\u3002",
    dailyGoal: "\u6bcf\u65e5\u76ee\u6807",
    continueLesson: "\u7ee7\u7eed\u5b66\u4e60",
    lessonComplete: "\u5df2\u5b8c\u6210",
    lessonReady: "\u7ee7\u7eed",
    lessonLocked: "\u4e0b\u4e00\u8bfe",
    lessonPathProgress: "\u5b66\u4e60\u8fdb\u5ea6",
    todaysPath: "\u4eca\u5929\u7684\u8def\u5f84",
    quizCoach: "\u5b66\u4e60\u4f19\u4f34",
    quizTip: "\u63d0\u793a"
  }
} satisfies Record<AppLanguage, Record<string, string>>;

const getText = (language: AppLanguage, key: keyof typeof translations.English) => translations[language][key];
const ThemeContext = React.createContext(false);

async function generateGeminiChapterSummary(chapter: Chapter, selectedLanguage: NoteLanguage) {
  const sections = chapter.notes[selectedLanguage] ?? chapter.notes["Bahasa Melayu"] ?? chapter.notes.English ?? [];
  const notesText = sections
    .map((section) => `${section.heading}\n${section.body.map((line) => `- ${line}`).join("\n")}`)
    .join("\n\n");
  const importantText = chapter.importantPoints.map((point) => `- ${point}`).join("\n");
  const keywordText = chapter.keywords.join(", ");

  const prompt = `You are a helpful Sejarah teacher for Malaysian secondary-school students.
Create a clear study summary in ${selectedLanguage}.

Chapter:
${chapter.form} Chapter ${chapter.chapterNumber}: ${chapter.title}

Description:
${chapter.description}

Notes:
${notesText}

Important points:
${importantText}

Keywords:
${keywordText}

Format the answer exactly like this:
1) Short summary: 4-6 student-friendly sentences.
2) Key points: 3-5 bullets.
3) Keywords: 3-6 keywords with very short meanings.
4) Revision questions: 2 quick questions.`;

  return requestAiTutor("summary", prompt);
}

async function requestAiTutor(mode: "summary" | "chat", prompt: string) {
  if (!isSupabaseConfigured || !AI_TUTOR_URL) {
    throw new Error("AI tutor is not configured.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("Please sign in again before using the AI tutor.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(AI_TUTOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: supabasePublishableKey
    },
      body: JSON.stringify({ mode, prompt }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "AI tutor request failed");
  }

  return typeof payload?.text === "string" ? payload.text.trim() : "";
}

async function generateGeminiChatAnswer(
  chapter: Chapter,
  selectedLanguage: NoteLanguage,
  question: string,
  chatHistory: AiChatMessage[]
) {
  const safeQuestion = question.trim().slice(0, MAX_AI_QUESTION_LENGTH);
  const sections = chapter.notes[selectedLanguage] ?? chapter.notes["Bahasa Melayu"] ?? chapter.notes.English ?? [];
  const notesText = sections
    .map((section) => `${section.heading}\n${section.body.map((line) => `- ${line}`).join("\n")}`)
    .join("\n\n");
  const importantText = chapter.importantPoints.map((point) => `- ${point}`).join("\n");
  const historyText = chatHistory
    .slice(-8)
    .map((message) => `${message.role === "user" ? "Student" : "Gemini"}: ${message.text}`)
    .join("\n");

  const prompt = `You are a patient Sejarah tutor for Malaysian secondary-school students.
Answer in ${selectedLanguage}.
Use only the chapter material below. If the question is outside the material, say so briefly and guide the student back to the chapter.

Chapter:
${chapter.form} Chapter ${chapter.chapterNumber}: ${chapter.title}

Description:
${chapter.description}

Notes:
${notesText}

Important points:
${importantText}

Recent saved chat:
${historyText || "No previous chat."}

Student question:
<student_question>${safeQuestion}</student_question>

Answer format:
- Give a clear answer in 3-6 short sentences.
- Include 1 textbook keyword if useful.
- If suitable, end with one quick revision tip.`;

  return requestAiTutor("chat", prompt);
}

const legacyScienceChapters: any[] = [
  {
    id: "transportation",
    chapterNumber: 3,
    title: "Transportation",
    description: "Blood circulation, transport in plants, and how living things move substances.",
    keywords: ["heart", "blood vessels", "xylem", "phloem", "transpiration"],
    commonMistakes: [
      "Confusing arteries with veins. Arteries carry blood away from the heart.",
      "Thinking xylem transports food. Xylem mainly transports water and minerals."
    ],
    notes: [
      {
        heading: "Main idea",
        body: [
          "Transportation systems move useful substances to cells and remove waste substances.",
          "Humans use blood, blood vessels, and the heart. Plants use xylem and phloem."
        ]
      },
      {
        heading: "Human transport",
        body: [
          "The heart pumps blood around the body.",
          "Arteries carry blood away from the heart. Veins carry blood back to the heart. Capillaries allow exchange with body cells."
        ]
      },
      {
        heading: "Plant transport",
        body: [
          "Xylem carries water and mineral salts from roots to leaves.",
          "Phloem carries glucose made during photosynthesis to other parts of the plant."
        ]
      },
      {
        heading: "Short summary",
        body: [
          "Transport keeps cells supplied with oxygen, water, minerals, and food while helping remove waste."
        ]
      }
    ],
    quiz: [
      {
        id: "t1",
        prompt: "Which blood vessel carries blood away from the heart?",
        options: ["Vein", "Artery", "Capillary", "Platelet"],
        correctIndex: 1,
        explanation: "Arteries carry blood away from the heart."
      },
      {
        id: "t2",
        prompt: "Which plant tissue transports water and mineral salts?",
        options: ["Xylem", "Phloem", "Stomata", "Cuticle"],
        correctIndex: 0,
        explanation: "Xylem transports water and mineral salts from the roots."
      },
      {
        id: "t3",
        prompt: "What is the main function of capillaries?",
        options: ["Pump blood", "Exchange substances with cells", "Store oxygen", "Produce glucose"],
        correctIndex: 1,
        explanation: "Capillaries have thin walls for exchange between blood and body cells."
      },
      {
        id: "t4",
        prompt: "What does phloem mainly transport?",
        options: ["Oxygen", "Glucose", "Mineral salts only", "Carbon dioxide only"],
        correctIndex: 1,
        explanation: "Phloem transports glucose produced by photosynthesis."
      },
      {
        id: "t5",
        prompt: "Why do organisms need transport systems?",
        options: ["To make cells heavier", "To move substances efficiently", "To stop respiration", "To remove all water"],
        correctIndex: 1,
        explanation: "Transport systems move useful substances and waste efficiently."
      }
    ]
  },
  {
    id: "thermochemistry",
    chapterNumber: 5,
    title: "Thermochemistry",
    description: "Heat changes in reactions, exothermic reactions, and endothermic reactions.",
    keywords: ["heat", "exothermic", "endothermic", "temperature", "energy"],
    commonMistakes: [
      "Assuming all reactions release heat. Some reactions absorb heat from the surroundings.",
      "Mixing up system and surroundings when describing temperature changes."
    ],
    notes: [
      {
        heading: "Main idea",
        body: [
          "Thermochemistry studies heat changes during chemical reactions.",
          "A reaction can release heat or absorb heat."
        ]
      },
      {
        heading: "Exothermic reaction",
        body: [
          "An exothermic reaction releases heat to the surroundings.",
          "The surroundings become warmer, so the measured temperature usually increases."
        ]
      },
      {
        heading: "Endothermic reaction",
        body: [
          "An endothermic reaction absorbs heat from the surroundings.",
          "The surroundings become cooler, so the measured temperature usually decreases."
        ]
      },
      {
        heading: "Examples",
        body: [
          "Burning fuel is exothermic.",
          "Some dissolving processes and thermal decomposition reactions can be endothermic."
        ]
      }
    ],
    quiz: [
      {
        id: "h1",
        prompt: "A reaction that releases heat is called",
        options: ["neutral", "exothermic", "endothermic", "evaporative"],
        correctIndex: 1,
        explanation: "Exothermic reactions release heat to the surroundings."
      },
      {
        id: "h2",
        prompt: "In an endothermic reaction, the surroundings usually become",
        options: ["cooler", "brighter", "heavier", "unchanged every time"],
        correctIndex: 0,
        explanation: "The reaction absorbs heat from the surroundings, so they become cooler."
      },
      {
        id: "h3",
        prompt: "Which is a common sign of an exothermic reaction?",
        options: ["Temperature decreases", "Temperature increases", "Mass disappears", "No energy change"],
        correctIndex: 1,
        explanation: "Released heat often causes an increase in temperature."
      },
      {
        id: "h4",
        prompt: "What does thermochemistry focus on?",
        options: ["Light only", "Heat changes in reactions", "Animal movement", "Plant classification"],
        correctIndex: 1,
        explanation: "Thermochemistry is about heat changes during reactions."
      },
      {
        id: "h5",
        prompt: "Burning fuel is usually an example of",
        options: ["exothermic reaction", "endothermic reaction", "freezing without heat", "photosynthesis only"],
        correctIndex: 0,
        explanation: "Burning releases heat energy, so it is exothermic."
      }
    ]
  },
  {
    id: "electricity-magnetism",
    chapterNumber: 6,
    title: "Electricity and Magnetism",
    description: "Electric circuits, current, voltage, resistance, magnets, and electromagnets.",
    keywords: ["current", "voltage", "resistance", "magnet", "electromagnet"],
    commonMistakes: [
      "Thinking current is used up by components. Current flows around a complete circuit.",
      "Forgetting that an electromagnet needs electric current to produce magnetism."
    ],
    notes: [
      {
        heading: "Electric circuits",
        body: [
          "A complete circuit allows electric current to flow.",
          "Current is the rate of flow of electric charge. Voltage is the energy supplied to move charges."
        ]
      },
      {
        heading: "Resistance",
        body: [
          "Resistance opposes the flow of current.",
          "A higher resistance usually reduces current if the voltage stays the same."
        ]
      },
      {
        heading: "Magnetism",
        body: [
          "A magnet has a north pole and a south pole.",
          "Like poles repel. Unlike poles attract."
        ]
      },
      {
        heading: "Electromagnets",
        body: [
          "An electromagnet is produced when electric current flows through a coil of wire.",
          "Its strength can be increased by using more turns of wire or a larger current."
        ]
      }
    ],
    quiz: [
      {
        id: "e1",
        prompt: "What is needed for current to flow in a simple circuit?",
        options: ["An open switch only", "A complete circuit", "No battery", "Only a plastic wire"],
        correctIndex: 1,
        explanation: "Current flows when there is a complete path."
      },
      {
        id: "e2",
        prompt: "Resistance",
        options: ["helps charge disappear", "opposes current flow", "is the same as mass", "only exists in magnets"],
        correctIndex: 1,
        explanation: "Resistance opposes the flow of electric current."
      },
      {
        id: "e3",
        prompt: "What happens when two north poles are brought together?",
        options: ["They attract", "They repel", "They become batteries", "They lose all magnetism"],
        correctIndex: 1,
        explanation: "Like magnetic poles repel each other."
      },
      {
        id: "e4",
        prompt: "An electromagnet works because",
        options: ["a current flows through a coil", "wood becomes charged", "heat removes electrons", "a switch is painted red"],
        correctIndex: 0,
        explanation: "Current through a coil produces a magnetic effect."
      },
      {
        id: "e5",
        prompt: "How can an electromagnet usually be made stronger?",
        options: ["Use fewer turns only", "Use more turns of wire", "Remove the power source", "Break the circuit"],
        correctIndex: 1,
        explanation: "More turns of wire can increase the strength of an electromagnet."
      }
    ]
  }
];

const createNotes = (
  englishIntro: string,
  englishDetails: string[],
  malayIntro: string,
  malayDetails: string[],
  chineseIntro: string,
  chineseDetails: string[]
): Record<NoteLanguage, { heading: string; body: string[] }[]> => ({
  English: [
    { heading: "Topic introduction", body: [englishIntro] },
    { heading: "Main facts", body: englishDetails },
    { heading: "Chapter summary", body: ["Focus on the key people, events, causes, effects, and dates in this chapter."] }
  ],
  "Bahasa Melayu": [
    { heading: "Pengenalan topik", body: [malayIntro] },
    { heading: "Fakta utama", body: malayDetails },
    { heading: "Ringkasan bab", body: ["Fokus kepada tokoh, peristiwa, sebab, kesan dan tarikh penting dalam bab ini."] }
  ],
  Chinese: [
    { heading: "课题简介", body: [chineseIntro] },
    { heading: "主要事实", body: chineseDetails },
    { heading: "章节总结", body: ["复习本章的重要人物、事件、原因、影响和日期。"] }
  ]
});

const chapters: Chapter[] = textbookChapters as Chapter[];

const emptyData: AppData = {
  users: [],
  tasksByUser: {},
  attemptsByUser: {},
  activitiesByUser: {},
  activityLogsByUser: {},
  completedNotesByUser: {},
  aiChatsByUser: {}
};

const normalizeAppData = (value: unknown): AppData => {
  const data = (value && typeof value === "object" ? value : {}) as Partial<AppData>;

  return {
    // Passwords from older prototype builds are deliberately discarded.
    users: Array.isArray(data.users)
      ? (data.users as Array<User & { password?: unknown }>).map(({ password: _legacyPassword, ...user }) => user)
      : [],
    activeUserId: data.activeUserId,
    tasksByUser: data.tasksByUser ?? {},
    attemptsByUser: data.attemptsByUser ?? {},
    activitiesByUser: data.activitiesByUser ?? {},
    activityLogsByUser: data.activityLogsByUser ?? {},
    completedNotesByUser: data.completedNotesByUser ?? {},
    aiChatsByUser: data.aiChatsByUser ?? {}
  };
};

const withUserStores = (current: AppData, userId: string, sourceUserId?: string): AppData => ({
  ...current,
  tasksByUser: { ...current.tasksByUser, [userId]: current.tasksByUser[userId] ?? (sourceUserId ? current.tasksByUser[sourceUserId] ?? [] : []) },
  attemptsByUser: {
    ...current.attemptsByUser,
    [userId]: current.attemptsByUser[userId] ?? (sourceUserId ? current.attemptsByUser[sourceUserId] ?? [] : [])
  },
  activitiesByUser: {
    ...current.activitiesByUser,
    [userId]: current.activitiesByUser[userId] ?? (sourceUserId ? current.activitiesByUser[sourceUserId] ?? [] : [])
  },
  activityLogsByUser: {
    ...current.activityLogsByUser,
    [userId]: current.activityLogsByUser[userId] ?? (sourceUserId ? current.activityLogsByUser[sourceUserId] ?? [] : [])
  },
  completedNotesByUser: {
    ...current.completedNotesByUser,
    [userId]: current.completedNotesByUser[userId] ?? (sourceUserId ? current.completedNotesByUser[sourceUserId] ?? {} : {})
  },
  aiChatsByUser: {
    ...current.aiChatsByUser,
    [userId]: current.aiChatsByUser[userId] ?? (sourceUserId ? current.aiChatsByUser[sourceUserId] ?? {} : {})
  }
});

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const appendUserActivity = (
  current: AppData,
  userId: string,
  type: UserActivity["type"],
  title: string,
  relatedId?: string
): AppData => {
  const activity: UserActivity = {
    id: makeId(),
    type,
    title,
    relatedId,
    date: getMalaysiaDateKey(),
    createdAt: new Date().toISOString()
  };

  return {
    ...current,
    activityLogsByUser: {
      ...current.activityLogsByUser,
      [userId]: [activity, ...(current.activityLogsByUser[userId] ?? [])].slice(0, 80)
    }
  };
};

const getMalaysiaDateKey = (date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const addDays = (dateKey: string, days: number) => {
  const date = new Date(`${dateKey}T00:00:00+08:00`);
  date.setDate(date.getDate() + days);
  return getMalaysiaDateKey(date);
};

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
const isValidDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const percent = (score: number, total: number) => (total === 0 ? 0 : Math.round((score / total) * 100));

const getQuizCoachMessage = (chapter: Chapter, question: QuizQuestion, questionIndex: number, selected: number) => {
  const focusWord = chapter.keywords[questionIndex % Math.max(chapter.keywords.length, 1)] ?? chapter.title;
  if (selected < 0) {
    return `Look for the clue around "${focusWord}". Read every option before choosing.`;
  }
  if (selected === question.correctIndex) {
    return `Good choice. ${question.explanation}`;
  }
  return `Almost there. ${question.explanation}`;
};

const getQuizCoachMotivation = (questionIndex: number) => {
  const messages = [
    "One step at a time.",
    "Trust the clue in the question.",
    "You are building exam memory.",
    "Slow reading wins this question.",
    "Keep the streak moving."
  ];
  return messages[questionIndex % messages.length];
};

const getCorrectFeedback = (questionIndex: number) => {
  const messages = ["Correct", "Nice work", "Great answer", "Well done", "You got it"];
  return messages[questionIndex % messages.length];
};

const getRandomQuizOptionOrder = (question: QuizQuestion) => {
  const ordered = question.options.map((_, optionIndex) => optionIndex);

  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }

  return ordered;
};

const getStoredCurrentStreak = (user: User) => {
  if (!user.lastActivityDate) {
    return 0;
  }
  const today = getMalaysiaDateKey();
  const yesterday = addDays(today, -1);
  if (user.lastActivityDate === today || user.lastActivityDate === yesterday) {
    return user.currentStreak;
  }
  return 0;
};

export default function App() {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authBusy, setAuthBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Home");
  const [screen, setScreen] = useState<Screen>({ name: "tabs" });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        let nextData = await loadJsonDatabase(emptyData, normalizeAppData);
        if (isSupabaseConfigured) {
          const { data: authData } = await supabase.auth.getUser();
          const authenticatedId = authData.user?.id;
          nextData = {
            ...nextData,
            activeUserId: authenticatedId && nextData.users.some((user) => user.id === authenticatedId)
              ? authenticatedId
              : undefined
          };
        } else {
          nextData = { ...nextData, activeUserId: undefined };
        }
        if (mounted) {
          setData(nextData);
        }
      } catch {
        Alert.alert("Storage error", "Saved data could not be loaded.");
      } finally {
        if (mounted) {
          setLoaded(true);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      saveJsonDatabase(data).catch(() => {
        Alert.alert("Storage error", "Changes could not be saved on this device.");
      });
    }
  }, [data, loaded]);

  const activeUser = data.users.find((user) => user.id === data.activeUserId);
  const userId = activeUser?.id ?? "";
  const tasks = userId ? data.tasksByUser[userId] ?? [] : [];
  const attempts = userId ? data.attemptsByUser[userId] ?? [] : [];
  const activities = userId ? data.activitiesByUser[userId] ?? [] : [];
  const activityLogs = userId ? data.activityLogsByUser[userId] ?? [] : [];
  const completedNotes = userId ? data.completedNotesByUser[userId] ?? {} : {};
  const aiChats = userId ? data.aiChatsByUser[userId] ?? {} : {};

  const updateData = (updater: (current: AppData) => AppData) => {
    setData((current) => updater(current));
  };

  const handleAuthSubmit = async (payload: { displayName: string; email: string; password: string; form: SchoolForm }) => {
    const email = payload.email.trim().toLowerCase();

    if (!isValidEmail(payload.email)) {
      return "Please enter a valid email address.";
    }
    if (payload.password.length < 8 || payload.password.length > 128) {
      return "Password must be between 8 and 128 characters.";
    }
    if (!isSupabaseConfigured) {
      return "Secure authentication is not configured. Add the Supabase publishable key to .env and restart Expo.";
    }

    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        if (!payload.displayName.trim()) {
          return "Please enter your display name.";
        }
        const displayName = payload.displayName.trim().slice(0, 80);
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password: payload.password,
          options: { data: { display_name: displayName, school_form: payload.form } }
        });
        if (error) return error.message;
        if (!signUpData.user || !signUpData.session) {
          setAuthMode("login");
          return "Check your email to confirm the account, then log in.";
        }

        const user: User = {
          id: signUpData.user.id,
          displayName,
          email,
          form: payload.form,
          appLanguage: "English",
          themeMode: "Light",
          notificationsEnabled: true,
          currentStreak: 0,
          bestStreak: 0,
          createdAt: new Date().toISOString()
        };

        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          display_name: user.displayName,
          school_form: user.form
        });
        if (profileError) return "Account created, but the profile could not be saved.";

        setData((current) =>
          appendUserActivity(
            withUserStores(
              {
                ...current,
                users: [...current.users, user],
                activeUserId: user.id
              },
              user.id
            ),
            user.id,
            "signup",
            "Registered new account"
          )
        );

        return undefined;
      }

      const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password: payload.password });
      if (error || !loginData.user) return "Email or password is incorrect.";

      const metadata = loginData.user.user_metadata ?? {};
      const existingUser = data.users.find((item) => item.id === loginData.user.id);
      const user: User = existingUser ?? {
        id: loginData.user.id,
        displayName: typeof metadata.display_name === "string" ? metadata.display_name.slice(0, 80) : email.split("@")[0],
        email,
        form: schoolForms.includes(metadata.school_form) ? metadata.school_form : "Form 1",
        appLanguage: "English",
        themeMode: "Light",
        notificationsEnabled: true,
        currentStreak: 0,
        bestStreak: 0,
        createdAt: loginData.user.created_at
      };

      if (!existingUser) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          display_name: user.displayName,
          school_form: user.form
        });
        if (profileError) return "Signed in, but the profile could not be loaded.";
      }

      setData((current) => appendUserActivity({
        ...withUserStores(current, user.id),
        users: existingUser ? current.users : [...current.users, user],
        activeUserId: user.id
      }, user.id, "login", "Logged in"));
      return undefined;
    } catch {
      return "Could not open the local JSON database. Please try again.";
    } finally {
      setAuthBusy(false);
    }
  };

  const recordActivity = (type: DailyActivity["type"], relatedId: string) => {
    if (!activeUser) {
      return;
    }
    const today = getMalaysiaDateKey();
    updateData((current) => {
      const existingActivities = current.activitiesByUser[activeUser.id] ?? [];
      const alreadyRecordedToday = existingActivities.some((activity) => activity.date === today);
      const activityLogMap: Record<DailyActivity["type"], { type: UserActivity["type"]; title: string }> = {
        task: { type: "task_completed", title: "Completed a task" },
        notes: { type: "notes_completed", title: "Completed chapter notes" },
        quiz: { type: "quiz_completed", title: "Completed a quiz" }
      };
      const users = current.users.map((user) => {
        if (user.id !== activeUser.id || alreadyRecordedToday) {
          return user;
        }
        const yesterday = addDays(today, -1);
        const nextStreak = user.lastActivityDate === yesterday ? user.currentStreak + 1 : 1;
        return {
          ...user,
          currentStreak: nextStreak,
          bestStreak: Math.max(user.bestStreak, nextStreak),
          lastActivityDate: today
        };
      });
      return appendUserActivity(
        {
        ...current,
        users,
        activitiesByUser: {
          ...current.activitiesByUser,
          [activeUser.id]: alreadyRecordedToday
            ? existingActivities
            : [...existingActivities, { id: makeId(), type, date: today, relatedId }]
        }
        },
        activeUser.id,
        activityLogMap[type].type,
        activityLogMap[type].title,
        relatedId
      );
    });
  };

  const tabPagerRef = useRef<ScrollView>(null);
  const tabScrollX = useRef(new Animated.Value(0)).current;
  const changeTab = (tab: Tab, animated = true) => {
    const nextIndex = appTabs.indexOf(tab);
    setActiveTab(tab);
    tabPagerRef.current?.scrollTo({ x: nextIndex * width, y: 0, animated });
  };

  useEffect(() => {
    if (screen.name === "tabs") {
      tabPagerRef.current?.scrollTo({ x: appTabs.indexOf(activeTab) * width, y: 0, animated: false });
    }
  }, [activeTab, screen.name, width]);

  const handleTabPageSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageIndex = Math.max(0, Math.min(appTabs.length - 1, Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1))));
    const nextTab = appTabs[pageIndex];
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <Centered>
          <Text style={styles.logo}>StudyStreak MY</Text>
        <Text style={styles.muted}>Loading StudyStreak MY...</Text>
        </Centered>
      </SafeAreaView>
    );
  }

  if (!activeUser) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={[styles.authContainer, width >= 760 && styles.authContainerWide]}>
            <View style={styles.authBrand}>
              <Text style={[styles.logo, styles.authLogo]}>StudyStreak MY</Text>
              <Text style={styles.authTitle}>{getText("English", "appTagline")}</Text>
              <View style={styles.authFeatureRow}>
                <Text style={styles.authFeature}>Sejarah</Text>
                <Text style={styles.authFeature}>Quiz</Text>
                <Text style={styles.authFeature}>Streak</Text>
              </View>
            </View>
            <AuthForm
              mode={authMode}
              loading={authBusy}
              onSwitch={() => setAuthMode(authMode === "login" ? "signup" : "login")}
              onSubmit={handleAuthSubmit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const activeUserWithLiveStreak: User = {
    ...activeUser,
    appLanguage: activeUser.appLanguage ?? "English",
    themeMode: activeUser.themeMode ?? "Light",
    currentStreak: getStoredCurrentStreak(activeUser)
  };
  const isDark = activeUserWithLiveStreak.themeMode === "Dark";
  const selectedLanguage: NoteLanguage = activeUserWithLiveStreak.appLanguage ?? "English";

  const commonProps = {
    user: activeUserWithLiveStreak,
    tasks,
    attempts,
    activities,
    activityLogs,
    completedNotes,
    selectedLanguage,
    isDark,
    t: (key: keyof typeof translations.English) => getText(activeUserWithLiveStreak.appLanguage ?? "English", key),
    setScreen,
    setActiveTab: changeTab
  };


  return (
    <ThemeContext.Provider value={isDark}>
      <SafeAreaView style={[styles.safe, isDark && styles.safeDark]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {screen.name === "tabs" ? (
        <View style={styles.flex}>
          <ScrollView
            ref={tabPagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            directionalLockEnabled
            scrollEventThrottle={8}
            decelerationRate="fast"
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: tabScrollX } } }], { useNativeDriver: false })}
            onMomentumScrollEnd={handleTabPageSettled}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.tabPage, { width }]}>
              <HomeScreen {...commonProps} />
            </View>
            <View style={[styles.tabPage, { width }]}>
              <TasksScreen
                {...commonProps}
                onCompleteTask={(taskId) => {
                  updateData((current) => ({
                    ...current,
                    tasksByUser: {
                      ...current.tasksByUser,
                      [userId]: tasks.map((task) =>
                        task.id === taskId
                          ? { ...task, status: "Completed", completedAt: new Date().toISOString() }
                          : task
                      )
                    }
                  }));
                  recordActivity("task", taskId);
                }}
                onDeleteTask={(taskId) => {
                  updateData((current) => ({
                    ...appendUserActivity(current, userId, "task_deleted", "Deleted a task", taskId),
                    tasksByUser: {
                      ...current.tasksByUser,
                      [userId]: tasks.filter((task) => task.id !== taskId)
                    }
                  }));
                }}
              />
            </View>
            <View style={[styles.tabPage, { width }]}>
              <LearnScreen {...commonProps} />
            </View>
            <View style={[styles.tabPage, { width }]}>
              <AiTutorScreen
                user={activeUserWithLiveStreak}
                selectedLanguage={selectedLanguage}
                chatMessagesByChapter={aiChats}
                isDark={isDark}
                t={commonProps.t}
                onSaveChatMessages={(chapterId, messages) => {
                  updateData((current) => {
                    const currentChatsByUser = current.aiChatsByUser ?? {};
                    return {
                      ...current,
                      aiChatsByUser: {
                        ...currentChatsByUser,
                        [userId]: {
                          ...(currentChatsByUser[userId] ?? {}),
                          [chapterId]: messages
                        }
                      }
                    };
                  });
                }}
              />
            </View>
            <View style={[styles.tabPage, { width }]}>
              <ProgressScreen {...commonProps} />
            </View>
            <View style={[styles.tabPage, { width }]}>
              <ProfileScreen
                {...commonProps}
                onUpdateProfile={(displayName, form, notificationsEnabled, appLanguage, themeMode) => {
                  const safeDisplayName = displayName.trim().slice(0, 80);
                  void supabase.from("profiles").update({
                    display_name: safeDisplayName,
                    school_form: form,
                    notifications_enabled: notificationsEnabled,
                    app_language: appLanguage,
                    theme_mode: themeMode,
                    updated_at: new Date().toISOString()
                  }).eq("id", userId);
                  updateData((current) => ({
                    ...appendUserActivity(current, userId, "profile_update", "Updated profile settings"),
                    users: current.users.map((user) =>
                      user.id === userId ? { ...user, displayName: safeDisplayName, form, notificationsEnabled, appLanguage, themeMode } : user
                    )
                  }));
                }}
                onLogout={() => {
                  void supabase.auth.signOut();
                  setScreen({ name: "tabs" });
                  changeTab("Home", false);
                  updateData((current) => ({ ...appendUserActivity(current, userId, "logout", "Logged out"), activeUserId: undefined }));
                }}
              />
            </View>
          </ScrollView>
          <BottomTabs activeTab={activeTab} onChange={changeTab} scrollX={tabScrollX} pageWidth={width} t={commonProps.t} />
        </View>
      ) : null}
      {screen.name === "taskForm" && (
        <TaskFormScreen
          task={screen.taskId ? tasks.find((task) => task.id === screen.taskId) : undefined}
          t={commonProps.t}
          onBack={() => setScreen({ name: "tabs" })}
          onSave={(task) => {
            updateData((current) => {
              const existing = current.tasksByUser[userId] ?? [];
              const isNewTask = !task.id;
              const nextTasks: HomeworkTask[] = task.id
                ? existing.map((item) => (item.id === task.id ? { ...item, ...task } : item))
                : [
                    ...existing,
                    {
                      ...task,
                      id: makeId(),
                      status: "Pending",
                      createdAt: new Date().toISOString()
                    }
                  ];
              const nextData = {
                ...current,
                tasksByUser: { ...current.tasksByUser, [userId]: nextTasks }
              };
              return isNewTask ? appendUserActivity(nextData, userId, "task_created", "Created a task") : nextData;
            });
            setScreen({ name: "tabs" });
            changeTab("Tasks", false);
          }}
        />
      )}
      {screen.name === "chapter" && (
        <ChapterScreen
          chapter={chapters.find((chapter) => chapter.id === screen.chapterId) ?? chapters[0]}
          attempts={attempts}
          completedNotes={completedNotes}
          selectedLanguage={selectedLanguage}
          t={commonProps.t}
          onBack={() => setScreen({ name: "tabs" })}
          onOpenNotes={(chapterId) => setScreen({ name: "notes", chapterId })}
          onStartQuiz={(chapterId) => setScreen({ name: "quiz", chapterId, returnTo: "chapter" })}
        />
      )}
      {screen.name === "notes" && (
        <NotesScreen
          chapter={chapters.find((chapter) => chapter.id === screen.chapterId) ?? chapters[0]}
          completed={Boolean(completedNotes[screen.chapterId])}
          selectedLanguage={selectedLanguage}
          chatMessages={aiChats[screen.chapterId] ?? []}
          t={commonProps.t}
          onBack={() => setScreen({ name: "chapter", chapterId: screen.chapterId })}
          onSaveChatMessages={(messages) => {
            updateData((current) => {
              const currentChatsByUser = current.aiChatsByUser ?? {};
              return {
                ...current,
                aiChatsByUser: {
                  ...currentChatsByUser,
                  [userId]: {
                    ...(currentChatsByUser[userId] ?? {}),
                    [screen.chapterId]: messages
                  }
                }
              };
            });
          }}
          onComplete={() => {
            updateData((current) => ({
              ...current,
              completedNotesByUser: {
                ...current.completedNotesByUser,
                [userId]: { ...(current.completedNotesByUser[userId] ?? {}), [screen.chapterId]: true }
              }
            }));
            recordActivity("notes", screen.chapterId);
          }}
        />
      )}
      {screen.name === "quiz" && (
        <QuizScreen
          chapter={chapters.find((chapter) => chapter.id === screen.chapterId) ?? chapters[0]}
          t={commonProps.t}
          onBack={() => {
            if (screen.returnTo === "tabs") {
              setScreen({ name: "tabs" });
              changeTab("Home", false);
              return;
            }
            setScreen({ name: "chapter", chapterId: screen.chapterId });
          }}
          onFinish={(answers) => {
            const chapter = chapters.find((item) => item.id === screen.chapterId) ?? chapters[0];
            const score = chapter.quiz.reduce((total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0), 0);
            const attempt: QuizAttempt = {
              id: makeId(),
              chapterId: chapter.id,
              score,
              total: chapter.quiz.length,
              answers,
              completedAt: new Date().toISOString()
            };
            updateData((current) => ({
              ...current,
              attemptsByUser: {
                ...current.attemptsByUser,
                [userId]: [...(current.attemptsByUser[userId] ?? []), attempt]
              }
            }));
            recordActivity("quiz", attempt.id);
            setScreen({ name: "result", attemptId: attempt.id, returnTo: screen.returnTo });
          }}
        />
      )}
      {screen.name === "result" && (
        <ResultScreen
          attempt={attempts.find((attempt) => attempt.id === screen.attemptId)}
          t={commonProps.t}
          onRetry={(chapterId) => setScreen({ name: "quiz", chapterId, returnTo: screen.returnTo })}
          onBackToLearn={() => {
            setScreen({ name: "tabs" });
            changeTab(screen.returnTo === "tabs" ? "Home" : "Learn", false);
          }}
        />
      )}
      {screen.name === "streak" && (
        <StreakScreen user={activeUserWithLiveStreak} activities={activities} t={commonProps.t} onBack={() => setScreen({ name: "tabs" })} />
      )}
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

function AuthForm({
  mode,
  loading,
  onSwitch,
  onSubmit
}: {
  mode: "login" | "signup";
  loading: boolean;
  onSwitch: () => void;
  onSubmit: (payload: { displayName: string; email: string; password: string; form: SchoolForm }) => Promise<string | undefined>;
}) {
  const isDark = React.useContext(ThemeContext);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState<SchoolForm>("Form 1");
  const [message, setMessage] = useState("");
  const appLanguage: AppLanguage = "English";
  const t = (key: keyof typeof translations.English) => getText(appLanguage, key);

  return (
    <View style={[styles.panel, styles.authPanel, isDark && styles.panelDark]}>
      <Text style={[styles.authFormTitle, isDark && styles.textDark]}>{mode === "signup" ? t("createAccount") : t("login")}</Text>
      {mode === "signup" && (
        <>
          <Field label={t("displayName")} value={displayName} onChangeText={setDisplayName} placeholder="Example: Aina" maxLength={80} />
          <Text style={[styles.label, isDark && styles.textDark]}>{t("schoolForm")}</Text>
          <View style={styles.wrapRow}>
            {schoolForms.map((item) => (
              <Chip key={item} label={item} selected={form === item} onPress={() => setForm(item)} />
            ))}
          </View>
        </>
      )}
      <Field label={t("email")} value={email} onChangeText={setEmail} placeholder="student@email.com" keyboardType="email-address" maxLength={254} />
      <Field label={t("password")} value={password} onChangeText={setPassword} placeholder="8-128 characters" secureTextEntry maxLength={128} />
      {message ? (
        <View style={[styles.messageBox, isDark && styles.messageBoxDark]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}
      <Button
        label={loading ? "Please wait..." : mode === "signup" ? t("signUp") : t("login")}
        disabled={loading}
        onPress={async () => {
          const error = await onSubmit({ displayName, email, password, form });
          setMessage(error ?? "");
        }}
      />
      <TouchableOpacity
        disabled={loading}
        onPress={() => {
          setMessage("");
          onSwitch();
        }}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>{mode === "signup" ? t("alreadyHaveAccount") : t("needAccount")}</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({
  user,
  tasks,
  attempts,
  completedNotes,
  isDark,
  t,
  setScreen,
  setActiveTab
}: CommonScreenProps) {
  const { width } = useWindowDimensions();
  const today = getMalaysiaDateKey();
  const todaysTasks = tasks.filter((task) => task.dueDate === today && task.status === "Pending");
  const completedCount = tasks.filter((task) => task.status === "Completed").length;
  const userForm: SchoolForm = schoolForms.includes(user.form as SchoolForm) ? (user.form as SchoolForm) : "Form 1";
  const formChapters = chapters.filter((chapter) => chapter.form === userForm);
  const pathItems = formChapters.map((chapter) => {
    const chapterAttempts = attempts.filter((attempt) => attempt.chapterId === chapter.id);
    const bestScore = chapterAttempts.length ? Math.max(...chapterAttempts.map((attempt) => percent(attempt.score, attempt.total))) : 0;
    const progress = (completedNotes[chapter.id] ? 50 : 0) + (chapterAttempts.length ? 50 : 0);
    return {
      chapter,
      bestScore,
      progress,
      complete: progress >= 100,
      started: progress > 0
    };
  });
  const completedPathCount = pathItems.filter((item) => item.complete).length;
  const firstOpenIndex = Math.max(0, pathItems.findIndex((item) => !item.complete));
  const currentPathItem = pathItems[firstOpenIndex] ?? pathItems[0];
  const pathProgress = pathItems.length ? Math.round((completedPathCount / pathItems.length) * 100) : 0;
  const dailyGoalDone = user.lastActivityDate === today;
  const gems = completedPathCount * 50 + attempts.length * 10 + completedCount * 5;
  const hearts = Math.max(1, 5 - todaysTasks.length);

  return (
    <ScreenScroll>
      <View style={[styles.duoCourseShell, isDark && styles.duoCourseShellDark, width >= 760 && styles.duoCourseShellWide]}>
        <View style={styles.duoCourseStats}>
          <View style={styles.duoProfileDot}>
            <Text style={styles.duoProfileText}>MY</Text>
          </View>
          <TouchableOpacity style={styles.duoCounter} activeOpacity={0.82} onPress={() => setScreen({ name: "streak" })}>
            <Text style={styles.duoCounterIcon}>F</Text>
            <Text style={styles.duoCounterText}>{user.currentStreak}</Text>
          </TouchableOpacity>
          <View style={styles.duoCounter}>
            <Text style={[styles.duoCounterIcon, styles.duoCounterGem]}>D</Text>
            <Text style={styles.duoCounterText}>{gems}</Text>
          </View>
          <View style={styles.duoCounter}>
            <Text style={[styles.duoCounterIcon, styles.duoCounterHeart]}>H</Text>
            <Text style={styles.duoCounterText}>{hearts}</Text>
          </View>
        </View>

        <View style={styles.duoUnitHeader}>
          <View style={styles.flex}>
            <Text style={styles.duoUnitEyebrow}>{userForm} | {t("lessonPathProgress")} {pathProgress}%</Text>
            <Text style={styles.duoUnitTitle}>{currentPathItem ? `Unit ${currentPathItem.chapter.chapterNumber}` : userForm}</Text>
            <Text style={styles.duoUnitSubtitle} numberOfLines={2}>
              {currentPathItem?.chapter.title ?? t("pathSubtitle")}
            </Text>
          </View>
          <TouchableOpacity style={styles.duoUnitButton} activeOpacity={0.82} onPress={() => setActiveTab("Learn")}>
            <Text style={styles.duoUnitButtonText}>LIST</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.duoMapStage, isDark && styles.duoMapStageDark]}>
          <View style={styles.duoMascotRow}>
            <View style={styles.duoMascot}>
              <View style={styles.duoMascotEyeRow}>
                <View style={styles.duoMascotEye} />
                <View style={styles.duoMascotEye} />
              </View>
              <Text style={styles.duoMascotSmile}>v</Text>
            </View>
            <View style={[styles.duoSpeech, isDark && styles.duoSpeechDark]}>
              <Text style={[styles.duoSpeechText, isDark && styles.textDark]}>
                {dailyGoalDone ? t("activityDoneToday") : t("completeActivityToday")}
              </Text>
            </View>
          </View>
        {pathItems.map((item, index) => {
          const locked = index > firstOpenIndex + 1;
          const active = index === firstOpenIndex;
          const stepOffset = index % 4 === 1 ? styles.duoMapStepRight : index % 4 === 3 ? styles.duoMapStepLeft : undefined;
          return (
            <View key={item.chapter.id} style={[styles.duoMapStep, stepOffset]}>
              {index > 0 ? <View style={[styles.duoMapConnector, isDark && styles.duoConnectorDark]} /> : null}
              {active ? <Text style={styles.duoStartBadge}>START</Text> : null}
              <TouchableOpacity
                activeOpacity={locked ? 1 : 0.82}
                disabled={locked}
                style={[
                  styles.duoMapNode,
                  isDark && styles.duoMapNodeDark,
                  item.complete && styles.duoMapNodeComplete,
                  active && styles.duoMapNodeActive,
                  locked && styles.duoMapNodeLocked
                ]}
                onPress={() => setScreen({ name: "quiz", chapterId: item.chapter.id, returnTo: "tabs" })}
              >
                <Text style={[styles.duoMapNodeText, locked && styles.duoMapNodeTextLocked]}>
                  {item.complete ? "OK" : locked ? "-" : `Q${item.chapter.chapterNumber}`}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.duoMapCaption, isDark && styles.mutedDark]} numberOfLines={2}>
                {item.complete ? t("lessonComplete") : locked ? t("lessonLocked") : t("startQuiz")}
              </Text>
            </View>
          );
        })}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button label={t("addTask")} onPress={() => setScreen({ name: "taskForm" })} compact />
        <Button label={t("startLearning")} onPress={() => setActiveTab("Learn")} compact variant="secondary" />
      </View>

      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("todaysHomework")}</Text>
      {todaysTasks.length === 0 ? (
        <EmptyState title={t("noTaskDueToday")} body={t("noTaskDueTodayBody")} />
      ) : (
        todaysTasks.map((task) => <TaskPreview key={task.id} task={task} onPress={() => setScreen({ name: "taskForm", taskId: task.id })} />)
      )}
      <Text style={[styles.muted, isDark && styles.mutedDark]}>{t("doneTasks")}: {completedCount}</Text>
    </ScreenScroll>
  );
}

type CommonScreenProps = {
  user: User;
  tasks: HomeworkTask[];
  attempts: QuizAttempt[];
  activities: DailyActivity[];
  activityLogs: UserActivity[];
  completedNotes: Record<string, boolean>;
  selectedLanguage: NoteLanguage;
  isDark: boolean;
  t: (key: keyof typeof translations.English) => string;
  setScreen: (screen: Screen) => void;
  setActiveTab: (tab: Tab) => void;
};

function TasksScreen({
  tasks,
  isDark,
  t,
  setScreen,
  onCompleteTask,
  onDeleteTask
}: CommonScreenProps & { onCompleteTask: (taskId: string) => void; onDeleteTask: (taskId: string) => void }) {
  const [filter, setFilter] = useState<"All" | TaskStatus>("Pending");
  const filteredTasks = tasks
    .filter((task) => filter === "All" || task.status === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <ScreenScroll>
      <ScreenHeader title={t("tasks")} subtitle={t("tasksSubtitle")} />
      <View style={styles.segmentRow}>
        {(["Pending", "Completed", "All"] as const).map((item) => (
          <Segment key={item} label={item} selected={filter === item} onPress={() => setFilter(item)} />
        ))}
      </View>
      <Button label={t("addHomeworkTask")} onPress={() => setScreen({ name: "taskForm" })} />
      {filteredTasks.length === 0 ? (
        <EmptyState title={t("noTasksHere")} body={t("noTasksBody")} />
      ) : (
        filteredTasks.map((task) => (
          <View key={task.id} style={[styles.taskCard, isDark && styles.panelDark]}>
            <TaskPreview task={task} onPress={() => setScreen({ name: "taskForm", taskId: task.id })} />
            <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{task.description || t("noDescription")}</Text>
            {task.proofUri ? <Text style={[styles.muted, isDark && styles.mutedDark]}>Proof/photo URI: {task.proofUri}</Text> : null}
            <View style={styles.actionRow}>
              {task.status === "Pending" && <Button label={t("markComplete")} compact onPress={() => onCompleteTask(task.id)} />}
              <Button label={t("edit")} compact variant="secondary" onPress={() => setScreen({ name: "taskForm", taskId: task.id })} />
              <Button
                label={t("delete")}
                compact
                variant="danger"
                onPress={() => {
                  Alert.alert("Delete task", "This task will be removed.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => onDeleteTask(task.id) }
                  ]);
                }}
              />
            </View>
          </View>
        ))
      )}
    </ScreenScroll>
  );
}

function TaskFormScreen({
  task,
  t,
  onBack,
  onSave
}: {
  task?: HomeworkTask;
  t: (key: keyof typeof translations.English) => string;
  onBack: () => void;
  onSave: (task: Partial<HomeworkTask> & Pick<HomeworkTask, "title" | "subject" | "description" | "dueDate" | "priority" | "proofUri">) => void;
}) {
  const isDark = React.useContext(ThemeContext);
  const [title, setTitle] = useState(task?.title ?? "");
  const subject: Subject = "Sejarah";
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? getMalaysiaDateKey());
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "Medium");
  const [proofUri, setProofUri] = useState(task?.proofUri ?? "");

  return (
    <ScreenScroll>
      <BackButton onPress={onBack} />
      <ScreenHeader title={task ? t("editTaskTitle") : t("addTaskTitle")} subtitle="YYYY-MM-DD" />
      <Field label={t("taskTitle")} value={title} onChangeText={setTitle} placeholder="Revise Sejarah Chapter 2" maxLength={120} />
      <View style={[styles.panel, isDark && styles.panelDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{t("subject")}</Text>
        <Text style={[styles.bodyText, isDark && styles.mutedDark]}>Sejarah</Text>
      </View>
      <Field label={t("description")} value={description} onChangeText={setDescription} placeholder="Add details" multiline maxLength={2_000} />
      <Field label={t("dueDate")} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" maxLength={10} />
      <Text style={[styles.label, isDark && styles.textDark]}>{t("priority")}</Text>
      <View style={styles.segmentRow}>
        {priorities.map((item) => (
          <Segment key={item} label={item} selected={priority === item} onPress={() => setPriority(item)} />
        ))}
      </View>
      <Field label="Optional proof/photo URI" value={proofUri} onChangeText={setProofUri} placeholder="Add image URL or file note" maxLength={2_048} />
      <Button
        label={t("saveTask")}
        onPress={() => {
          if (!title.trim()) {
            Alert.alert("Task title needed", "A task cannot be saved without a title.");
            return;
          }
          if (!isValidDateKey(dueDate)) {
            Alert.alert("Invalid due date", "Use the format YYYY-MM-DD.");
            return;
          }
          onSave({
            id: task?.id,
            status: task?.status,
            createdAt: task?.createdAt,
            completedAt: task?.completedAt,
            title: title.trim(),
            subject,
            description: description.trim(),
            dueDate,
            priority,
            proofUri: proofUri.trim()
          });
        }}
      />
    </ScreenScroll>
  );
}

function LearnScreen({ user, attempts, completedNotes, selectedLanguage, isDark, t, setScreen }: CommonScreenProps) {
  const selectedForm: SchoolForm = schoolForms.includes(user.form as SchoolForm) ? (user.form as SchoolForm) : "Form 1";
  const visibleChapters = chapters.filter((chapter) => chapter.form === selectedForm);

  return (
    <ScreenScroll>
      <ScreenHeader title={t("learn")} subtitle={t("learnSubtitle")} />
      <Text style={[styles.label, isDark && styles.textDark]}>{t("schoolForm")}: {selectedForm}</Text>
      <Text style={[styles.label, isDark && styles.textDark]}>{t("notesLanguage")}: {selectedLanguage}</Text>
      {visibleChapters.map((chapter) => {
        const chapterAttempts = attempts.filter((attempt) => attempt.chapterId === chapter.id);
        const best = chapterAttempts.length
          ? Math.max(...chapterAttempts.map((attempt) => percent(attempt.score, attempt.total)))
          : 0;
        const progress = (completedNotes[chapter.id] ? 50 : 0) + (chapterAttempts.length ? 50 : 0);
        return (
          <TouchableOpacity key={chapter.id} style={[styles.chapterCard, isDark && styles.panelDark]} onPress={() => setScreen({ name: "chapter", chapterId: chapter.id })}>
            <Text style={styles.eyebrow}>{chapter.form} | Chapter {chapter.chapterNumber}</Text>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>{chapter.title}</Text>
            <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{chapter.description}</Text>
            <ProgressBar value={progress} />
            <Text style={[styles.muted, isDark && styles.mutedDark]}>{t("progressLabel")} {progress}% {best ? `| ${t("bestQuiz")} ${best}%` : ""}</Text>
          </TouchableOpacity>
        );
      })}
    </ScreenScroll>
  );
}

function ChapterScreen({
  chapter,
  attempts,
  completedNotes,
  selectedLanguage,
  t,
  onBack,
  onOpenNotes,
  onStartQuiz
}: {
  chapter: Chapter;
  attempts: QuizAttempt[];
  completedNotes: Record<string, boolean>;
  selectedLanguage: NoteLanguage;
  t: (key: keyof typeof translations.English) => string;
  onBack: () => void;
  onOpenNotes: (chapterId: string) => void;
  onStartQuiz: (chapterId: string) => void;
}) {
  const isDark = React.useContext(ThemeContext);
  const chapterAttempts = attempts.filter((attempt) => attempt.chapterId === chapter.id);
  const lastAttempt = chapterAttempts[chapterAttempts.length - 1];
  const progress = (completedNotes[chapter.id] ? 50 : 0) + (chapterAttempts.length ? 50 : 0);

  return (
    <ScreenScroll>
      <BackButton onPress={onBack} />
      <Text style={styles.eyebrow}>{chapter.form} | Chapter {chapter.chapterNumber}</Text>
      <Text style={[styles.title, isDark && styles.textDark]}>{chapter.title}</Text>
      <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{chapter.description}</Text>
      <ProgressBar value={progress} />
      <Text style={[styles.muted, isDark && styles.mutedDark]}>{t("progressLabel")}: {progress}%</Text>
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("notesLanguage")}: {selectedLanguage}</Text>
      <View style={styles.actionRow}>
        <Button label={completedNotes[chapter.id] ? `${t("view")} ${selectedLanguage}` : `${t("view")} ${selectedLanguage}`} compact onPress={() => onOpenNotes(chapter.id)} />
        <Button label={t("startQuiz")} compact variant="secondary" onPress={() => onStartQuiz(chapter.id)} />
      </View>
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("importantPoints")}</Text>
      {chapter.importantPoints.map((point) => (
        <BulletItem key={point} text={point} />
      ))}
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("keywords")}</Text>
      <View style={styles.wrapRow}>
        {chapter.keywords.map((keyword) => (
          <View key={keyword} style={[styles.keyword, isDark && styles.keywordDark]}>
            <Text style={[styles.keywordText, isDark && styles.keywordTextDark]}>{keyword}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("quizHistory")}</Text>
      {lastAttempt ? (
        <View style={[styles.panel, isDark && styles.panelDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>Latest score: {lastAttempt.score}/{lastAttempt.total}</Text>
          <Text style={[styles.muted, isDark && styles.mutedDark]}>{percent(lastAttempt.score, lastAttempt.total)}% completed on {lastAttempt.completedAt.slice(0, 10)}</Text>
        </View>
      ) : (
        <EmptyState title={t("noQuizAttempt")} body={t("noQuizAttemptBody")} />
      )}
    </ScreenScroll>
  );
}

function NotesScreen({
  chapter,
  completed,
  selectedLanguage,
  chatMessages,
  t,
  onBack,
  onSaveChatMessages,
  onComplete
}: {
  chapter: Chapter;
  completed: boolean;
  selectedLanguage: NoteLanguage;
  chatMessages: AiChatMessage[];
  t: (key: keyof typeof translations.English) => string;
  onBack: () => void;
  onSaveChatMessages: (messages: AiChatMessage[]) => void;
  onComplete: () => void;
}) {
  const isDark = React.useContext(ThemeContext);
  const sections = chapter.notes[selectedLanguage] ?? chapter.notes["Bahasa Melayu"] ?? chapter.notes.English ?? [];
  const [aiSummary, setAiSummary] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [question, setQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleGenerateAiSummary = async () => {
    setIsLoadingAi(true);
    setAiSummary("");

    try {
      const summary = await generateGeminiChapterSummary(chapter, selectedLanguage);
      setAiSummary(summary || t("aiSummaryError"));
    } catch (error) {
      console.error("Gemini API Error:", error);
      setAiSummary(t("aiSummaryError"));
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleAskGemini = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isChatLoading) {
      return;
    }

    const userMessage: AiChatMessage = {
      id: makeId(),
      role: "user",
      text: trimmedQuestion,
      createdAt: new Date().toISOString(),
      language: selectedLanguage
    };
    const nextMessages = [...chatMessages, userMessage];
    onSaveChatMessages(nextMessages);
    setQuestion("");
    setIsChatLoading(true);

    try {
      const answer = await generateGeminiChatAnswer(chapter, selectedLanguage, trimmedQuestion, nextMessages);
      const assistantMessage: AiChatMessage = {
        id: makeId(),
        role: "assistant",
        text: answer || t("geminiAnswerError"),
        createdAt: new Date().toISOString(),
        language: selectedLanguage
      };
      onSaveChatMessages([...nextMessages, assistantMessage]);
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      const assistantMessage: AiChatMessage = {
        id: makeId(),
        role: "assistant",
        text: t("geminiAnswerError"),
        createdAt: new Date().toISOString(),
        language: selectedLanguage
      };
      onSaveChatMessages([...nextMessages, assistantMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <ScreenScroll>
      <BackButton onPress={onBack} />
      <ScreenHeader title={`${chapter.title} ${t("notesLanguage")}`} subtitle={`${selectedLanguage}`} />
      {sections.length === 0 ? (
        <EmptyState title={t("notesLanguage")} body={t("noQuizAttemptBody")} />
      ) : null}
      {sections.map((section, sectionIndex) => (
        <View key={`${selectedLanguage}-${section.heading}-${sectionIndex}`} style={[styles.panel, styles.notePanel, isDark && styles.panelDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>{section.heading}</Text>
          {section.body.map((line, lineIndex) => (
            <BulletItem key={`${section.heading}-${lineIndex}`} text={line} />
          ))}
        </View>
      ))}
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("importantPoints")}</Text>
      {chapter.importantPoints.map((point) => (
        <BulletItem key={point} text={point} />
      ))}
      <View style={[styles.panel, isDark && styles.panelDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{t("aiSummary")}</Text>
        <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{t("aiSummarySubtitle")}</Text>
        <View style={styles.actionRow}>
          <Button
            label={isLoadingAi ? t("generatingAiSummary") : t("generateAiSummary")}
            disabled={isLoadingAi}
            compact
            onPress={handleGenerateAiSummary}
          />
          {aiSummary ? (
            <Button label={t("clearAiSummary")} compact variant="secondary" onPress={() => setAiSummary("")} />
          ) : null}
        </View>
        {isLoadingAi ? <ActivityIndicator size="small" color="#0f766e" style={styles.aiLoader} /> : null}
        {aiSummary ? (
          <Text selectable style={[styles.aiSummaryText, isDark && styles.mutedDark]}>{aiSummary}</Text>
        ) : (
          <Text style={[styles.muted, isDark && styles.mutedDark]}>{t("aiSummaryPlaceholder")}</Text>
        )}
      </View>
      <View style={[styles.panel, isDark && styles.panelDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{t("aiTutorChat")}</Text>
        <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{t("aiTutorSubtitle")}</Text>
        {chatMessages.length === 0 ? (
          <Text style={[styles.muted, isDark && styles.mutedDark]}>{t("noChatYet")}</Text>
        ) : (
          <View style={styles.chatList}>
            {chatMessages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.chatBubble,
                  message.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                  isDark && message.role === "assistant" && styles.chatBubbleAssistantDark
                ]}
              >
                <Text style={[styles.chatRole, message.role === "user" && styles.chatRoleUser]}>
                  {message.role === "user" ? t("askQuestion") : "Gemini"}
                </Text>
                <Text selectable style={[styles.chatText, message.role === "user" && styles.chatTextUser, isDark && message.role === "assistant" && styles.mutedDark]}>
                  {message.text}
                </Text>
              </View>
            ))}
          </View>
        )}
        {isChatLoading ? <ActivityIndicator size="small" color="#0f766e" style={styles.aiLoader} /> : null}
        <Text style={[styles.label, isDark && styles.textDark]}>{t("askQuestion")}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, isDark && styles.inputDark]}
          value={question}
          onChangeText={setQuestion}
          placeholder={t("askQuestionPlaceholder")}
        placeholderTextColor="#94a3b8"
        multiline
        maxLength={MAX_AI_QUESTION_LENGTH}
        />
        <View style={styles.actionRow}>
          <Button
            label={isChatLoading ? t("askingGemini") : t("sendQuestion")}
            disabled={isChatLoading || !question.trim()}
            compact
            onPress={handleAskGemini}
          />
          {chatMessages.length > 0 ? (
            <Button label={t("clearChat")} compact variant="secondary" onPress={() => onSaveChatMessages([])} />
          ) : null}
        </View>
      </View>
      <Button label={completed ? t("notesCompleted") : t("markNotesCompleted")} disabled={completed} onPress={onComplete} />
    </ScreenScroll>
  );
}

function AiTutorScreen({
  user,
  selectedLanguage,
  chatMessagesByChapter,
  isDark,
  t,
  onSaveChatMessages
}: {
  user: User;
  selectedLanguage: NoteLanguage;
  chatMessagesByChapter: Record<string, AiChatMessage[]>;
  isDark: boolean;
  t: (key: keyof typeof translations.English) => string;
  onSaveChatMessages: (chapterId: string, messages: AiChatMessage[]) => void;
}) {
  const userForm: SchoolForm = schoolForms.includes(user.form as SchoolForm) ? (user.form as SchoolForm) : "Form 1";
  const visibleChapters = chapters.filter((chapter) => chapter.form === userForm);
  const [selectedChapterId, setSelectedChapterId] = useState(visibleChapters[0]?.id ?? chapters[0]?.id ?? "");
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? visibleChapters[0] ?? chapters[0];
  const chatMessages = selectedChapter ? chatMessagesByChapter[selectedChapter.id] ?? [] : [];
  const [question, setQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (!visibleChapters.some((chapter) => chapter.id === selectedChapterId)) {
      setSelectedChapterId(visibleChapters[0]?.id ?? chapters[0]?.id ?? "");
    }
  }, [selectedChapterId, visibleChapters]);

  const handleAskGemini = async () => {
    const trimmedQuestion = question.trim();
    if (!selectedChapter || !trimmedQuestion || isChatLoading) {
      return;
    }

    const userMessage: AiChatMessage = {
      id: makeId(),
      role: "user",
      text: trimmedQuestion,
      createdAt: new Date().toISOString(),
      language: selectedLanguage
    };
    const nextMessages = [...chatMessages, userMessage];
    onSaveChatMessages(selectedChapter.id, nextMessages);
    setQuestion("");
    setIsChatLoading(true);

    try {
      const answer = await generateGeminiChatAnswer(selectedChapter, selectedLanguage, trimmedQuestion, nextMessages);
      const assistantMessage: AiChatMessage = {
        id: makeId(),
        role: "assistant",
        text: answer || t("geminiAnswerError"),
        createdAt: new Date().toISOString(),
        language: selectedLanguage
      };
      onSaveChatMessages(selectedChapter.id, [...nextMessages, assistantMessage]);
    } catch (error) {
      console.error("Gemini AI Page Error:", error);
      const assistantMessage: AiChatMessage = {
        id: makeId(),
        role: "assistant",
        text: t("geminiAnswerError"),
        createdAt: new Date().toISOString(),
        language: selectedLanguage
      };
      onSaveChatMessages(selectedChapter.id, [...nextMessages, assistantMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <ScreenScroll>
      <ScreenHeader title={t("aiPageTitle")} subtitle={t("aiPageSubtitle")} />
      <Text style={[styles.label, isDark && styles.textDark]}>{t("chooseChapter")}</Text>
      <View style={styles.wrapRow}>
        {visibleChapters.map((chapter) => (
          <Chip
            key={chapter.id}
            label={`C${chapter.chapterNumber}`}
            selected={selectedChapter?.id === chapter.id}
            onPress={() => setSelectedChapterId(chapter.id)}
          />
        ))}
      </View>
      {selectedChapter ? (
        <>
          <View style={[styles.panel, isDark && styles.panelDark]}>
            <Text style={styles.eyebrow}>{selectedChapter.form} | Chapter {selectedChapter.chapterNumber}</Text>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>{selectedChapter.title}</Text>
            <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{selectedChapter.description}</Text>
            <Text style={[styles.label, isDark && styles.textDark]}>{t("notesLanguage")}: {selectedLanguage}</Text>
          </View>
          <View style={[styles.panel, isDark && styles.panelDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>{t("aiTutorChat")}</Text>
            <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{t("aiTutorSubtitle")}</Text>
            {chatMessages.length === 0 ? (
              <Text style={[styles.muted, isDark && styles.mutedDark]}>{t("noChatYet")}</Text>
            ) : (
              <View style={styles.chatList}>
                {chatMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.chatBubble,
                      message.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                      isDark && message.role === "assistant" && styles.chatBubbleAssistantDark
                    ]}
                  >
                    <Text style={[styles.chatRole, message.role === "user" && styles.chatRoleUser]}>
                      {message.role === "user" ? t("askQuestion") : "Gemini"}
                    </Text>
                    <Text selectable style={[styles.chatText, message.role === "user" && styles.chatTextUser, isDark && message.role === "assistant" && styles.mutedDark]}>
                      {message.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {isChatLoading ? <ActivityIndicator size="small" color="#0f766e" style={styles.aiLoader} /> : null}
            <Text style={[styles.label, isDark && styles.textDark]}>{t("askQuestion")}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, isDark && styles.inputDark]}
              value={question}
              onChangeText={setQuestion}
              placeholder={t("askQuestionPlaceholder")}
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={MAX_AI_QUESTION_LENGTH}
            />
            <View style={styles.actionRow}>
              <Button
                label={isChatLoading ? t("askingGemini") : t("sendQuestion")}
                disabled={isChatLoading || !question.trim()}
                compact
                onPress={handleAskGemini}
              />
              {chatMessages.length > 0 ? (
                <Button label={t("clearChat")} compact variant="secondary" onPress={() => onSaveChatMessages(selectedChapter.id, [])} />
              ) : null}
            </View>
          </View>
        </>
      ) : (
        <EmptyState title={t("chooseChapter")} body={t("noQuizAttemptBody")} />
      )}
    </ScreenScroll>
  );
}

function QuizScreen({
  chapter,
  t,
  onBack,
  onFinish
}: {
  chapter: Chapter;
  t: (key: keyof typeof translations.English) => string;
  onBack: () => void;
  onFinish: (answers: number[]) => void;
}) {
  const isDark = React.useContext(ThemeContext);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(chapter.quiz.length).fill(-1));
  const [optionOrders] = useState<number[][]>(() => chapter.quiz.map((quizQuestion) => getRandomQuizOptionOrder(quizQuestion)));
  const question = chapter.quiz[index];
  const selected = answers[index];
  const hasAnswered = selected >= 0;
  const selectedCorrect = selected === question.correctIndex;
  const coachMessage = getQuizCoachMessage(chapter, question, index, selected);
  const coachMotivation = hasAnswered && selectedCorrect ? getCorrectFeedback(index) : getQuizCoachMotivation(index);
  const optionOrder = optionOrders[index] ?? question.options.map((_, optionIndex) => optionIndex);
  const optionLabels = ["A", "B", "C", "D"];
  const correctDisplayIndex = optionOrder.indexOf(question.correctIndex);

  return (
    <ScreenScroll>
      <BackButton onPress={onBack} />
      <Text style={styles.eyebrow}>{chapter.title}</Text>
      <Text style={[styles.title, isDark && styles.textDark]}>{index + 1} / {chapter.quiz.length}</Text>
      <View style={[styles.quizCoachCard, isDark && styles.panelDark]}>
        <View style={styles.quizCoachCharacter}>
          <View style={styles.quizCoachHat} />
          <View style={styles.quizCoachFace}>
            <View style={styles.quizCoachEyes}>
              <View style={styles.quizCoachEye} />
              <View style={styles.quizCoachEye} />
            </View>
            <Text style={styles.quizCoachMouth}>u</Text>
          </View>
          <View style={styles.quizCoachBody} />
        </View>
        <View style={styles.quizCoachBubble}>
          <Text style={styles.eyebrow}>{t("quizCoach")}</Text>
          <Text style={[styles.quizCoachMotivation, isDark && styles.textDark]}>{coachMotivation}</Text>
          <Text style={[styles.quizCoachTip, isDark && styles.mutedDark]}>{t("quizTip")}: {coachMessage}</Text>
        </View>
      </View>
      <View style={[styles.panel, isDark && styles.panelDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{question.prompt}</Text>
        {optionOrder.map((optionIndex, displayIndex) => {
          const option = question.options[optionIndex];
          const isCorrectOption = hasAnswered && optionIndex === question.correctIndex;
          const isWrongSelected = hasAnswered && selected === optionIndex && optionIndex !== question.correctIndex;
          const isSelectedPending = !hasAnswered && selected === optionIndex;
          return (
            <TouchableOpacity
              key={`${question.id}-${optionIndex}`}
              style={[
                styles.option,
                isDark && styles.optionDark,
                isSelectedPending && styles.optionSelected,
                isCorrectOption && styles.optionCorrect,
                isWrongSelected && styles.optionWrong
              ]}
              onPress={() => setAnswers((current) => current.map((answer, answerIndex) => (answerIndex === index ? optionIndex : answer)))}
            >
              <Text
                style={[
                  styles.optionText,
                  isDark && styles.textDark,
                  isSelectedPending && styles.optionTextSelected,
                  (isCorrectOption || isWrongSelected) && styles.optionRevealText
                ]}
              >
                {optionLabels[displayIndex] ?? displayIndex + 1}. {option}
              </Text>
            </TouchableOpacity>
          );
        })}
        {hasAnswered ? (
          <View style={[styles.quizAnswerFeedback, selectedCorrect ? styles.quizAnswerFeedbackCorrect : styles.quizAnswerFeedbackWrong]}>
            <Text style={selectedCorrect ? styles.quizAnswerFeedbackCorrectText : styles.quizAnswerFeedbackWrongText}>
              {selectedCorrect ? `${getCorrectFeedback(index)}.` : "Not quite."}
            </Text>
            {!selectedCorrect ? (
              <Text style={styles.quizCorrectAnswerText}>
                Correct answer: {optionLabels[correctDisplayIndex] ?? correctDisplayIndex + 1}. {question.options[question.correctIndex]}
              </Text>
            ) : null}
            <Text style={selectedCorrect ? styles.quizAnswerFeedbackCorrectText : styles.quizAnswerFeedbackWrongText}>
              {question.explanation}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actionRow}>
        {index > 0 && <Button label={t("previous")} compact variant="secondary" onPress={() => setIndex(index - 1)} />}
        <Button
          label={index === chapter.quiz.length - 1 ? t("finishQuiz") : t("next")}
          compact
          onPress={() => {
            if (selected < 0) {
              Alert.alert("Choose an answer", "Select one answer before continuing.");
              return;
            }
            if (index === chapter.quiz.length - 1) {
              onFinish(answers);
            } else {
              setIndex(index + 1);
            }
          }}
        />
      </View>
    </ScreenScroll>
  );
}

function ResultScreen({ attempt, t, onRetry, onBackToLearn }: { attempt?: QuizAttempt; t: (key: keyof typeof translations.English) => string; onRetry: (chapterId: string) => void; onBackToLearn: () => void }) {
  const isDark = React.useContext(ThemeContext);
  const chapter = chapters.find((item) => item.id === attempt?.chapterId);
  if (!attempt || !chapter) {
    return (
      <ScreenScroll>
        <EmptyState title={t("quizResult")} body={t("returnToLearn")} />
        <Button label={t("returnToLearn")} onPress={onBackToLearn} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll>
      <ScreenHeader title={t("quizResult")} subtitle={chapter.title} />
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{t("score")}</Text>
        <Text style={styles.heroNumber}>{attempt.score}/{attempt.total}</Text>
        <Text style={styles.heroSubtext}>{percent(attempt.score, attempt.total)}% correct</Text>
      </View>
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("reviewAnswers")}</Text>
      {chapter.quiz.map((question, index) => {
        const selected = attempt.answers[index];
        const correct = selected === question.correctIndex;
        return (
          <View key={question.id} style={[styles.panel, isDark && styles.panelDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>{index + 1}. {question.prompt}</Text>
            <Text style={correct ? styles.correctText : styles.wrongText}>
              {t("yourAnswer")}: {selected >= 0 ? question.options[selected] : "-"}
            </Text>
            {!correct && <Text style={styles.correctText}>{t("correctAnswer")}: {question.options[question.correctIndex]}</Text>}
            <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{question.explanation}</Text>
          </View>
        );
      })}
      <View style={styles.actionRow}>
        <Button label={t("retryQuiz")} compact onPress={() => onRetry(chapter.id)} />
        <Button label={t("returnToLearn")} compact variant="secondary" onPress={onBackToLearn} />
      </View>
    </ScreenScroll>
  );
}

function ProgressScreen({ user, tasks, attempts, completedNotes, isDark, t, setScreen }: CommonScreenProps) {
  const completedTasks = tasks.filter((task) => task.status === "Completed").length;
  const averageScore = attempts.length
    ? Math.round(attempts.reduce((total, attempt) => total + percent(attempt.score, attempt.total), 0) / attempts.length)
    : 0;
  const startedChapters = chapters.filter((chapter) => completedNotes[chapter.id] || attempts.some((attempt) => attempt.chapterId === chapter.id)).length;
  const completedChapters = chapters.filter((chapter) => completedNotes[chapter.id] && attempts.some((attempt) => attempt.chapterId === chapter.id)).length;

  return (
    <ScreenScroll>
      <ScreenHeader title={t("progress")} subtitle={t("progressSubtitle")} />
      <View style={styles.statGrid}>
        <StatCard label={t("currentStreak")} value={user.currentStreak.toString()} />
        <StatCard label={t("bestStreak")} value={user.bestStreak.toString()} />
        <StatCard label={t("completedTasks")} value={completedTasks.toString()} />
        <StatCard label={t("averageScoreShort")} value={`${averageScore}%`} />
        <StatCard label={t("chaptersStarted")} value={startedChapters.toString()} />
        <StatCard label={t("chaptersCompleted")} value={completedChapters.toString()} />
      </View>
      <Button label={t("openStreakCalendar")} onPress={() => setScreen({ name: "streak" })} />
      <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{t("chapterProgressTitle")}</Text>
      {chapters.map((chapter) => {
        const chapterAttempts = attempts.filter((attempt) => attempt.chapterId === chapter.id);
        const progress = (completedNotes[chapter.id] ? 50 : 0) + (chapterAttempts.length ? 50 : 0);
        return (
          <View key={chapter.id} style={[styles.panel, isDark && styles.panelDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>{chapter.form} Chapter {chapter.chapterNumber}: {chapter.title}</Text>
            <ProgressBar value={progress} />
            <Text style={[styles.muted, isDark && styles.mutedDark]}>{progress}% complete | {chapterAttempts.length} quiz attempt(s)</Text>
          </View>
        );
      })}
    </ScreenScroll>
  );
}

function ProfileScreen({
  user,
  tasks,
  attempts,
  isDark,
  onUpdateProfile,
  onLogout
}: CommonScreenProps & {
  onUpdateProfile: (displayName: string, form: string, notificationsEnabled: boolean, appLanguage: AppLanguage, themeMode: ThemeMode) => void;
  onLogout: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [form, setForm] = useState<SchoolForm>(schoolForms.includes(user.form as SchoolForm) ? (user.form as SchoolForm) : "Form 1");
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(user.appLanguage ?? "English");
  const [themeMode, setThemeMode] = useState<ThemeMode>(user.themeMode ?? "Light");
  const [notificationsEnabled, setNotificationsEnabled] = useState(user.notificationsEnabled);
  const [showSettings, setShowSettings] = useState(false);
  const completedTasks = tasks.filter((task) => task.status === "Completed").length;
  const achievements = [
    { label: "First quiz", earned: attempts.length > 0 },
    { label: "Homework finisher", earned: completedTasks > 0 },
    { label: "Three-day streak", earned: user.bestStreak >= 3 },
    { label: "Chapter starter", earned: attempts.length > 0 || completedTasks > 0 }
  ];

  return (
    <View style={[styles.profileScreenShell, isDark && styles.safeDark]}>
      <ScreenScroll>
        <View style={styles.profileHeaderRow}>
          <View style={styles.profileHeaderCopy}>
            <Text style={[styles.title, isDark && styles.textDark]}>{getText(appLanguage, "profile")}</Text>
            <Text style={[styles.muted, isDark && styles.mutedDark]}>{user.displayName} | {form}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.82}
            style={[styles.profileSettingsFab, isDark && styles.profileSettingsFabDark]}
            onPress={() => setShowSettings((current) => !current)}
          >
            <Text style={styles.profileSettingsFabText}>⚙</Text>
          </TouchableOpacity>
        </View>
        {showSettings && (
          <View style={[styles.panel, isDark && styles.panelDark]}>
            <Field label={getText(appLanguage, "displayName")} value={displayName} onChangeText={setDisplayName} maxLength={80} />
            <Text style={[styles.label, isDark && styles.textDark]}>{getText(appLanguage, "schoolForm")}</Text>
            <View style={styles.wrapRow}>
              {schoolForms.map((item) => (
                <Chip key={item} label={item} selected={form === item} onPress={() => setForm(item)} />
              ))}
            </View>
            <TouchableOpacity style={[styles.toggleRow, isDark && styles.toggleRowDark]} onPress={() => setNotificationsEnabled(!notificationsEnabled)}>
              <View style={styles.flex}>
                <Text style={[styles.listTitle, isDark && styles.textDark]}>{getText(appLanguage, "studyReminders")}</Text>
                <Text style={[styles.muted, isDark && styles.mutedDark]}>{getText(appLanguage, "reminderHelp")}</Text>
              </View>
              <Text style={styles.toggle}>{notificationsEnabled ? getText(appLanguage, "on") : getText(appLanguage, "off")}</Text>
            </TouchableOpacity>
            <Text style={[styles.label, isDark && styles.textDark]}>{getText(appLanguage, "appLanguage")}</Text>
            <View style={styles.wrapRow}>
              {appLanguages.map((item) => (
                <Chip key={item} label={item} selected={appLanguage === item} onPress={() => setAppLanguage(item)} />
              ))}
            </View>
            <Text style={[styles.label, isDark && styles.textDark]}>{getText(appLanguage, "themeMode")}</Text>
            <View style={styles.segmentRow}>
              {themeModes.map((item) => (
                <Segment key={item} label={item === "Light" ? getText(appLanguage, "light") : getText(appLanguage, "dark")} selected={themeMode === item} onPress={() => setThemeMode(item)} />
              ))}
            </View>
            <Button label={getText(appLanguage, "saveProfile")} onPress={() => onUpdateProfile(displayName.trim() || user.displayName, form, notificationsEnabled, appLanguage, themeMode)} />
          </View>
        )}
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{getText(appLanguage, "achievements")}</Text>
        <View style={styles.statGrid}>
          {achievements.map((achievement) => (
              <View key={achievement.label} style={styles.statCard}>
              <View style={[
                styles.achievementCard,
                isDark && styles.achievementCardDark,
                achievement.earned && styles.achievementCardEarned,
                isDark && achievement.earned && styles.achievementCardEarnedDark
              ]}>
                <Text style={[styles.achievementText, achievement.earned && styles.achievementTextEarned]}>
                  {achievement.earned ? getText(appLanguage, "unlocked") : getText(appLanguage, "locked")}
                </Text>
                <Text style={[styles.muted, isDark && styles.mutedDark]}>{achievement.label}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>{getText(appLanguage, "quizHistory")}</Text>
        {attempts.length === 0 ? (
          <EmptyState title={getText(appLanguage, "noQuizHistory")} body={getText(appLanguage, "noQuizHistoryBody")} />
        ) : (
          attempts.slice().reverse().map((attempt) => {
            const chapter = chapters.find((item) => item.id === attempt.chapterId);
            return (
              <View key={attempt.id} style={[styles.listItem, isDark && styles.panelDark]}>
                <View>
                  <Text style={[styles.listTitle, isDark && styles.textDark]}>{chapter ? `${chapter.form} ${chapter.title}` : "Sejarah quiz"}</Text>
                  <Text style={[styles.muted, isDark && styles.mutedDark]}>{attempt.completedAt.slice(0, 10)}</Text>
                </View>
                <Text style={styles.scoreBadge}>{percent(attempt.score, attempt.total)}%</Text>
              </View>
            );
          })
        )}
        <View style={[styles.panel, isDark && styles.panelDark]}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>{getText(appLanguage, "privacyNote")}</Text>
          <Text style={[styles.bodyText, isDark && styles.mutedDark]}>
            {getText(appLanguage, "privacyBody")}
          </Text>
        </View>
        <Button label={getText(appLanguage, "logout")} variant="danger" onPress={onLogout} />
      </ScreenScroll>
    </View>
  );
}

function StreakScreen({ user, activities, t, onBack }: { user: User; activities: DailyActivity[]; t: (key: keyof typeof translations.English) => string; onBack: () => void }) {
  const isDark = React.useContext(ThemeContext);
  const today = getMalaysiaDateKey();
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));

  return (
    <ScreenScroll>
      <BackButton onPress={onBack} />
      <ScreenHeader title={t("studyStreak")} subtitle={t("streakSubtitle")} />
      <View style={styles.statGrid}>
        <StatCard label={t("current")} value={`${user.currentStreak}`} />
        <StatCard label={t("bestStreak")} value={`${user.bestStreak}`} />
      </View>
      <View style={styles.calendarRow}>
        {days.map((day) => {
          const active = activities.some((activity) => activity.date === day);
          return (
            <View key={day} style={[styles.dayCell, isDark && styles.dayCellDark, active && styles.dayCellActive]}>
              <Text style={[styles.dayText, isDark && styles.textDark, active && styles.dayTextActive]}>{day.slice(5)}</Text>
              <Text style={[styles.dayLabel, isDark && styles.mutedDark, active && styles.dayTextActive]}>{active ? "Done" : "None"}</Text>
            </View>
          );
        })}
      </View>
      <View style={[styles.panel, isDark && styles.panelDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{t("validActivities")}</Text>
        <BulletItem text={t("validTask")} />
        <BulletItem text={t("validNotes")} />
        <BulletItem text={t("validQuiz")} />
        <Text style={[styles.bodyText, isDark && styles.mutedDark]}>{t("appOpenNoCount")}</Text>
      </View>
    </ScreenScroll>
  );
}

function BottomTabs({
  activeTab,
  onChange,
  scrollX,
  pageWidth,
  t
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  scrollX: Animated.Value;
  pageWidth: number;
  t: (key: keyof typeof translations.English) => string;
}) {
  const labels: Record<Tab, keyof typeof translations.English> = {
    Home: "home",
    Tasks: "tasks",
    Learn: "learn",
    AI: "ai",
    Progress: "progress",
    Profile: "profile"
  };
  const icons: Record<Tab, string> = {
    Home: "⌂",
    Tasks: "✓",
    Learn: "▤",
    AI: "✦",
    Progress: "↗",
    Profile: "○"
  };
  const isDark = React.useContext(ThemeContext);
  const [barWidth, setBarWidth] = useState(0);
  const innerPadding = 7;
  const safePageWidth = Math.max(pageWidth, 1);
  const indicatorWidth = barWidth > 0 ? (barWidth - innerPadding * 2) / appTabs.length : 0;
  const inputRange = appTabs.map((_, index) => index * safePageWidth);
  const indicatorTranslateX =
    indicatorWidth > 0
      ? scrollX.interpolate({
          inputRange,
          outputRange: appTabs.map((_, index) => innerPadding + index * indicatorWidth),
          extrapolate: "clamp"
        })
      : 0;

  return (
    <View style={[styles.tabBar, isDark && styles.tabBarDark]} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
      {indicatorWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabLiquidIndicator,
            isDark && styles.tabLiquidIndicatorDark,
            {
              width: indicatorWidth,
              transform: [{ translateX: indicatorTranslateX }]
            }
          ]}
        />
      ) : null}
      {appTabs.map((tab, index) => {
        const focusScale = scrollX.interpolate({
          inputRange: [(index - 1) * safePageWidth, index * safePageWidth, (index + 1) * safePageWidth],
          outputRange: [1, 1.32, 1],
          extrapolate: "clamp"
        });
        const focusLift = scrollX.interpolate({
          inputRange: [(index - 1) * safePageWidth, index * safePageWidth, (index + 1) * safePageWidth],
          outputRange: [0, -4, 0],
          extrapolate: "clamp"
        });

        return (
          <TouchableOpacity
            key={tab}
            activeOpacity={0.82}
            style={styles.tabButton}
            onPress={() => onChange(tab)}
          >
            <Animated.Text
              style={[
                styles.tabIcon,
                isDark && styles.tabTextDark,
                activeTab === tab && styles.tabTextActive,
                { transform: [{ scale: focusScale }, { translateY: focusLift }] }
              ]}
            >
              {icons[tab]}
            </Animated.Text>
            <Animated.Text
              numberOfLines={1}
              style={[
                styles.tabText,
                isDark && styles.tabTextDark,
                activeTab === tab && styles.tabTextActive,
                { transform: [{ scale: focusScale }] }
              ]}
            >
              {t(labels[tab])}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ScreenScroll({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDark = React.useContext(ThemeContext);

  return (
    <ScrollView
      style={[styles.flex, isDark && styles.safeDark]}
      contentContainerStyle={[
        styles.screenContent,
        { paddingTop: topSafeInset + 22 },
        width >= 760 && styles.screenContentWide
      ]}
      directionalLockEnabled
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const isDark = React.useContext(ThemeContext);
  return (
    <View style={styles.headerBlock}>
      <Text style={[styles.title, isDark && styles.textDark]}>{title}</Text>
      <Text style={[styles.muted, isDark && styles.mutedDark]}>{subtitle}</Text>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  maxLength
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  multiline?: boolean;
  maxLength?: number;
}) {
  const isDark = React.useContext(ThemeContext);
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, isDark && styles.textDark]}>{label}</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#94a3b8" : "#94a3b8"}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        multiline={multiline}
        maxLength={maxLength}
      />
    </View>
  );
}

function Button({
  label,
  onPress,
  variant = "primary",
  compact,
  disabled
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={0.82}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        disabled && styles.buttonDisabled
      ]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, variant === "secondary" && styles.buttonSecondaryText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backButton}>
      <Text style={styles.linkText}>Back</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const isDark = React.useContext(ThemeContext);
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.statCard, width >= 760 && styles.statCardWide, isDark && styles.statCardDark]}>
      <Text style={[styles.statValue, isDark && styles.statValueDark]}>{value}</Text>
      <Text style={[styles.muted, isDark && styles.mutedDark]}>{label}</Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
    </View>
  );
}

function BulletItem({ text }: { text: string }) {
  const isDark = React.useContext(ThemeContext);
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, isDark && styles.bulletDotDark]} />
      <Text style={[styles.bulletText, isDark && styles.mutedDark]}>{text}</Text>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  const isDark = React.useContext(ThemeContext);
  return (
    <View style={[styles.emptyState, isDark && styles.panelDark]}>
      <Text style={[styles.cardTitle, isDark && styles.textDark]}>{title}</Text>
      <Text style={[styles.muted, isDark && styles.mutedDark]}>{body}</Text>
    </View>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const isDark = React.useContext(ThemeContext);
  return (
    <TouchableOpacity activeOpacity={0.82} style={[styles.segment, isDark && styles.segmentDark, selected && styles.segmentSelected]} onPress={onPress}>
      <Text style={[styles.segmentText, isDark && styles.textDark, selected && styles.segmentTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const isDark = React.useContext(ThemeContext);
  return (
    <TouchableOpacity activeOpacity={0.82} style={[styles.chip, isDark && styles.chipDark, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, isDark && styles.textDark, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TaskPreview({ task, onPress }: { task: HomeworkTask; onPress: () => void }) {
  const isDark = React.useContext(ThemeContext);
  return (
    <TouchableOpacity activeOpacity={0.82} style={[styles.listItem, isDark && styles.panelDark]} onPress={onPress}>
      <View style={styles.flex}>
        <Text style={[styles.listTitle, isDark && styles.textDark]}>{task.title}</Text>
        <Text style={[styles.muted, isDark && styles.mutedDark]}>{task.subject} | Due {task.dueDate} | {task.priority}</Text>
      </View>
      <Text style={task.status === "Completed" ? styles.doneBadge : styles.pendingBadge}>{task.status}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef6f5"
  },
  safeDark: {
    backgroundColor: "#07111f"
  },
  flex: {
    flex: 1
  },
  tabPage: {
    flex: 1
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingVertical: 38
  },
  authContainerWide: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 760
  },
  screenContent: {
    padding: 18,
    paddingTop: 20,
    paddingBottom: 144
  },
  screenContentWide: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 1040,
    paddingTop: topSafeInset + 30
  },
  logo: {
    color: "#0f172a",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: 8
  },
  authLogo: {
    color: "#ffffff"
  },
  authBrand: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    padding: 22,
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  authTitle: {
    color: "#dffcf6",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14
  },
  authFeatureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  authFeature: {
    color: "#0f766e",
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  authPanel: {
    marginBottom: 0
  },
  authFormTitle: {
    color: "#0f172a",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    marginBottom: 14
  },
  title: {
    color: "#0f172a",
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    marginBottom: 8
  },
  textDark: {
    color: "#f8fafc"
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    marginTop: 22,
    marginBottom: 12
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    marginBottom: 10
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 4
  },
  muted: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 21
  },
  mutedDark: {
    color: "#cbd5e1"
  },
  bodyText: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 10
  },
  aiSummaryText: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 25,
    marginTop: 6
  },
  quizCoachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  quizCoachCharacter: {
    width: 78,
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  quizCoachHat: {
    width: 46,
    height: 22,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    marginBottom: -4,
    transform: [{ rotate: "-8deg" }],
    zIndex: 2
  },
  quizCoachFace: {
    width: 58,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#ccfbf1",
    borderColor: "#5eead4",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  },
  quizCoachEyes: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 1
  },
  quizCoachEye: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#134e4a"
  },
  quizCoachMouth: {
    color: "#134e4a",
    fontSize: 18,
    lineHeight: 19,
    fontWeight: "900"
  },
  quizCoachBody: {
    width: 66,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    marginTop: -4
  },
  quizCoachBubble: {
    flex: 1
  },
  quizCoachMotivation: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    marginBottom: 4
  },
  quizCoachTip: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20
  },
  aiLoader: {
    marginVertical: 10
  },
  chatList: {
    marginTop: 8,
    marginBottom: 14
  },
  chatBubble: {
    borderRadius: 8,
    maxWidth: "92%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  chatBubbleUser: {
    backgroundColor: "#0f766e",
    alignSelf: "flex-end",
    marginLeft: 28
  },
  chatBubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    borderColor: "#dbe5ef",
    borderWidth: 1,
    marginRight: 28
  },
  chatBubbleAssistantDark: {
    backgroundColor: "#0b1120",
    borderColor: "#475569"
  },
  chatRole: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 5,
    textTransform: "uppercase"
  },
  chatRoleUser: {
    color: "#ccfbf1"
  },
  chatText: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 24
  },
  chatTextUser: {
    color: "#ffffff"
  },
  bullet: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0f766e",
    marginTop: 9,
    marginRight: 10
  },
  bulletDotDark: {
    backgroundColor: "#5eead4"
  },
  bulletText: {
    flex: 1,
    color: "#334155",
    fontSize: 15,
    lineHeight: 24
  },
  headerBlock: {
    marginBottom: 18
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  notePanel: {
    paddingTop: 20,
    paddingBottom: 12
  },
  panelDark: {
    backgroundColor: "#121c2e",
    borderColor: "#2d3b52"
  },
  hero: {
    backgroundColor: "#0f5f59",
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  heroLabel: {
    color: "#ccfbf1",
    fontSize: 14,
    fontWeight: "700"
  },
  heroNumber: {
    color: "#ffffff",
    fontSize: 40,
    fontWeight: "900",
    marginVertical: 6
  },
  heroSubtext: {
    color: "#e0f2fe",
    fontSize: 14,
    lineHeight: 21
  },
  duoCourseShell: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  duoCourseShellDark: {
    backgroundColor: "#0b1120",
    borderColor: "#2d3b52"
  },
  duoCourseShellWide: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 560
  },
  duoCourseStats: {
    minHeight: 58,
    backgroundColor: "#0f766e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  duoProfileDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#d7ffb8",
    borderWidth: 2
  },
  duoProfileText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "900"
  },
  duoCounter: {
    minWidth: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  duoCounterIcon: {
    color: "#f97316",
    fontSize: 18,
    fontWeight: "900"
  },
  duoCounterGem: {
    color: "#2563eb"
  },
  duoCounterHeart: {
    color: "#f43f5e"
  },
  duoCounterText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  duoUnitHeader: {
    backgroundColor: "#0f766e",
    borderTopColor: "rgba(255,255,255,0.24)",
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18
  },
  duoUnitEyebrow: {
    color: "#d7ffb8",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  duoUnitTitle: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  duoUnitSubtitle: {
    color: "#f7fee7",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 2
  },
  duoUnitButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1
  },
  duoUnitButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  duoMapStage: {
    minHeight: 560,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 18,
    backgroundColor: "#ffffff"
  },
  duoMapStageDark: {
    backgroundColor: "#0b1120"
  },
  duoMascotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 18
  },
  duoMascot: {
    width: 82,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-5deg" }]
  },
  duoMascotEyeRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 2
  },
  duoMascotEye: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#0f766e",
    borderWidth: 3
  },
  duoMascotSmile: {
    color: "#134e4a",
    fontSize: 17,
    lineHeight: 18,
    fontWeight: "900"
  },
  duoSpeech: {
    flex: 1,
    maxWidth: 280,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  duoSpeechDark: {
    backgroundColor: "#12221a",
    borderColor: "#245540"
  },
  duoSpeechText: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  duoMapStep: {
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 18,
    width: 150
  },
  duoMapStepLeft: {
    transform: [{ translateX: -72 }]
  },
  duoMapStepRight: {
    transform: [{ translateX: 72 }]
  },
  duoMapConnector: {
    width: 6,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#d9f99d",
    marginBottom: 8
  },
  duoStartBadge: {
    color: "#0f766e",
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderColor: "#d9f99d",
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: -6,
    zIndex: 3,
    fontSize: 12,
    fontWeight: "900"
  },
  duoMapNode: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    borderColor: "#134e4a",
    borderWidth: 5,
    shadowColor: "#0f766e",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4
  },
  duoMapNodeDark: {
    backgroundColor: "#134e4a",
    borderColor: "#5eead4"
  },
  duoMapNodeComplete: {
    backgroundColor: "#facc15",
    borderColor: "#eab308",
    shadowColor: "#ca8a04"
  },
  duoMapNodeActive: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#0f766e",
    borderColor: "#99f6e4"
  },
  duoMapNodeLocked: {
    backgroundColor: "#e5e7eb",
    borderColor: "#d1d5db",
    shadowOpacity: 0
  },
  duoMapNodeText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  duoMapNodeTextLocked: {
    color: "#94a3b8"
  },
  duoMapCaption: {
    color: "#64748b",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 8
  },
  duoHeader: {
    marginBottom: 14
  },
  duoHeaderWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18
  },
  duoHeaderCopy: {
    flex: 1
  },
  duoStreakPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8
  },
  duoStreakIcon: {
    color: "#ea580c",
    backgroundColor: "#ffedd5",
    overflow: "hidden",
    borderRadius: 8,
    width: 34,
    height: 34,
    lineHeight: 34,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900"
  },
  duoStreakNumber: {
    color: "#9a3412",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900"
  },
  duoStreakLabel: {
    color: "#c2410c",
    fontSize: 11,
    fontWeight: "900"
  },
  duoHero: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#166534",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  duoHeroDark: {
    backgroundColor: "#14532d"
  },
  duoHeroWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14
  },
  duoHeroMain: {
    flex: 1,
    justifyContent: "center"
  },
  duoHeroLabel: {
    color: "#dcfce7",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  duoHeroTitle: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    marginBottom: 6
  },
  duoHeroSubtext: {
    color: "#f0fdf4",
    fontSize: 14,
    lineHeight: 21
  },
  duoGoalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14,
    marginTop: 14,
    minWidth: 150
  },
  duoGoalNumber: {
    color: "#16a34a",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900"
  },
  duoGoalLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900"
  },
  duoMetricRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  duoMetric: {
    flex: 1,
    minHeight: 72,
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: "center"
  },
  duoMetricValue: {
    color: "#0f172a",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    marginBottom: 2
  },
  duoMetricLabel: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800"
  },
  duoContinueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderColor: "#86efac",
    borderWidth: 2,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#16a34a",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  duoContinueIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    borderColor: "#15803d",
    borderWidth: 3
  },
  duoContinueIconText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900"
  },
  duoQuizCta: {
    alignSelf: "flex-start",
    color: "#166534",
    backgroundColor: "#dcfce7",
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "900"
  },
  duoPath: {
    paddingTop: 4,
    paddingBottom: 8
  },
  duoPathRow: {
    minHeight: 132,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 10,
    position: "relative"
  },
  duoPathRowRight: {
    justifyContent: "flex-end"
  },
  duoConnector: {
    position: "absolute",
    left: 31,
    top: 78,
    width: 5,
    height: 78,
    borderRadius: 8,
    backgroundColor: "#bbf7d0"
  },
  duoConnectorRight: {
    left: undefined,
    right: 31
  },
  duoConnectorDark: {
    backgroundColor: "#245540"
  },
  duoLessonNode: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    borderColor: "#15803d",
    borderWidth: 4,
    shadowColor: "#166534",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    zIndex: 2
  },
  duoLessonNodeDark: {
    backgroundColor: "#166534",
    borderColor: "#22c55e"
  },
  duoLessonNodeComplete: {
    backgroundColor: "#0f766e",
    borderColor: "#14b8a6"
  },
  duoLessonNodeActive: {
    backgroundColor: "#22c55e",
    borderColor: "#bbf7d0",
    transform: [{ scale: 1.06 }]
  },
  duoLessonNodeLocked: {
    backgroundColor: "#e2e8f0",
    borderColor: "#cbd5e1",
    shadowOpacity: 0
  },
  duoLessonNodeText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  duoLessonNodeTextLocked: {
    color: "#94a3b8"
  },
  duoLessonCard: {
    width: "72%",
    maxWidth: 520,
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    padding: 13,
    marginLeft: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  duoLessonCardActive: {
    borderColor: "#22c55e",
    borderWidth: 2
  },
  duoLessonCardLocked: {
    opacity: 0.62
  },
  duoLessonStatus: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  duoLessonStatusComplete: {
    color: "#0f766e"
  },
  duoLessonTitle: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginBottom: 5
  },
  duoLessonMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  statCard: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  statCardWide: {
    width: "23%"
  },
  statCardDark: {
    backgroundColor: "#121c2e",
    borderColor: "#2d3b52"
  },
  statValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 2
  },
  statValueDark: {
    color: "#f8fafc"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginHorizontal: -4,
    marginBottom: 10
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    borderRadius: 8,
    minHeight: 50,
    paddingHorizontal: 18,
    marginVertical: 6,
    shadowColor: "#0f766e",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  buttonCompact: {
    flexGrow: 1,
    marginHorizontal: 4,
    minHeight: 42
  },
  buttonSecondary: {
    backgroundColor: "#ecfeff",
    borderColor: "#99f6e4",
    borderWidth: 1,
    shadowOpacity: 0
  },
  buttonDanger: {
    backgroundColor: "#b91c1c",
    shadowColor: "#b91c1c"
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  buttonSecondaryText: {
    color: "#0f766e"
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: "center"
  },
  linkText: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "800"
  },
  messageBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  messageBoxDark: {
    backgroundColor: "#450a0a",
    borderColor: "#7f1d1d"
  },
  messageText: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "700"
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 18,
    marginBottom: 8
  },
  fieldBlock: {
    marginBottom: 12
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6
  },
  input: {
    minHeight: 50,
    backgroundColor: "#fbfefd",
    borderColor: "#bed8d4",
    borderWidth: 1,
    borderRadius: 8,
    color: "#0f172a",
    fontSize: 15,
    paddingHorizontal: 14
  },
  inputDark: {
    backgroundColor: "#07111f",
    borderColor: "#3b4b63",
    color: "#f8fafc"
  },
  inputMultiline: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 12
  },
  segment: {
    flex: 1,
    alignItems: "center",
    borderColor: "#bed8d4",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    marginHorizontal: 4,
    backgroundColor: "#ffffff"
  },
  segmentDark: {
    backgroundColor: "#121c2e",
    borderColor: "#3b4b63"
  },
  segmentSelected: {
    backgroundColor: "#134e4a",
    borderColor: "#134e4a"
  },
  segmentText: {
    color: "#334155",
    fontWeight: "800"
  },
  segmentTextSelected: {
    color: "#ffffff"
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  chip: {
    borderColor: "#bed8d4",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#ffffff"
  },
  chipDark: {
    backgroundColor: "#121c2e",
    borderColor: "#3b4b63"
  },
  chipSelected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e"
  },
  chipText: {
    color: "#334155",
    fontWeight: "800"
  },
  chipTextSelected: {
    color: "#ffffff"
  },
  listItem: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  listTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3
  },
  activityRow: {
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  activityRowDark: {
    borderBottomColor: "#334155"
  },
  activityBadge: {
    color: "#0f766e",
    backgroundColor: "#ccfbf1",
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize",
    maxWidth: 110
  },
  chevron: {
    color: "#0f766e",
    fontWeight: "800"
  },
  taskCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14
  },
  pendingBadge: {
    color: "#92400e",
    backgroundColor: "#fef3c7",
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800"
  },
  doneBadge: {
    color: "#166534",
    backgroundColor: "#dcfce7",
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800"
  },
  scoreBadge: {
    color: "#0f766e",
    fontSize: 18,
    fontWeight: "900"
  },
  chapterCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e6e4",
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  achievementCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe5ef",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    minHeight: 84,
    justifyContent: "center"
  },
  achievementCardDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155"
  },
  achievementCardEarned: {
    backgroundColor: "#ecfeff",
    borderColor: "#14b8a6"
  },
  achievementCardEarnedDark: {
    backgroundColor: "#123735",
    borderColor: "#2dd4bf"
  },
  achievementText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4
  },
  achievementTextEarned: {
    color: "#0f766e"
  },
  keyword: {
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  keywordDark: {
    backgroundColor: "#123044"
  },
  keywordText: {
    color: "#075985",
    fontWeight: "800"
  },
  keywordTextDark: {
    color: "#bae6fd"
  },
  progressTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
    marginVertical: 10
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#14b8a6"
  },
  option: {
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 8,
    padding: 13,
    marginBottom: 10,
    backgroundColor: "#ffffff"
  },
  optionDark: {
    backgroundColor: "#0f172a",
    borderColor: "#475569"
  },
  optionSelected: {
    backgroundColor: "#134e4a",
    borderColor: "#134e4a"
  },
  optionCorrect: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
    borderWidth: 2
  },
  optionWrong: {
    backgroundColor: "#fee2e2",
    borderColor: "#dc2626",
    borderWidth: 2
  },
  optionText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700"
  },
  optionTextSelected: {
    color: "#ffffff"
  },
  optionRevealText: {
    color: "#0f172a",
    fontWeight: "900"
  },
  quizAnswerFeedback: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 6
  },
  quizAnswerFeedbackCorrect: {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a"
  },
  quizAnswerFeedbackWrong: {
    backgroundColor: "#fef2f2",
    borderColor: "#dc2626"
  },
  quizAnswerFeedbackCorrectText: {
    color: "#166534",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 4
  },
  quizAnswerFeedbackWrongText: {
    color: "#991b1b",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 4
  },
  quizCorrectAnswerText: {
    color: "#166534",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    marginBottom: 4
  },
  correctText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6
  },
  wrongText: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe5ef",
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    marginVertical: 10
  },
  toggleRow: {
    borderColor: "#dbe5ef",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  toggleRowDark: {
    backgroundColor: "#0b1120",
    borderColor: "#475569"
  },
  toggle: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "900"
  },
  settingsBox: {
    borderColor: "#dbe5ef",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#f8fafc"
  },
  settingsBoxDark: {
    backgroundColor: "#0b1120",
    borderColor: "#475569"
  },
  profileScreenShell: {
    flex: 1
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 16
  },
  profileHeaderCopy: {
    flex: 1
  },
  profileSettingsFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    borderColor: "#99f6e4",
    borderWidth: 2,
    shadowColor: "#0f766e",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  profileSettingsFabDark: {
    backgroundColor: "#14b8a6",
    borderColor: "#5eead4"
  },
  profileSettingsFabText: {
    color: "#ffffff",
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "900"
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  dayCell: {
    width: "13%",
    backgroundColor: "#ffffff",
    borderColor: "#dbe5ef",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center"
  },
  dayCellDark: {
    backgroundColor: "#182235",
    borderColor: "#334155"
  },
  dayCellActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e"
  },
  dayText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900"
  },
  dayLabel: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 4
  },
  dayTextActive: {
    color: "#ffffff"
  },
  tabBar: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: Platform.OS === "ios" ? 16 : 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderRadius: 34,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: "hidden"
  },
  tabBarDark: {
    backgroundColor: "rgba(18, 28, 46, 0.82)",
    borderColor: "rgba(148, 163, 184, 0.22)"
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    minHeight: 56,
    paddingHorizontal: 4,
    paddingVertical: 9,
    zIndex: 2
  },
  tabLiquidIndicator: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 0,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: 0,
    shadowColor: "#0f766e",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  tabLiquidIndicatorDark: {
    backgroundColor: "rgba(45, 212, 191, 0.2)"
  },
  tabButtonActive: {
    backgroundColor: "transparent"
  },
  tabButtonActiveDark: {
    backgroundColor: "transparent"
  },
  tabText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900"
  },
  tabIcon: {
    color: "#64748b",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    marginBottom: 2
  },
  tabTextDark: {
    color: "#cbd5e1"
  },
  tabTextActive: {
    color: "#0f766e"
  }
});
