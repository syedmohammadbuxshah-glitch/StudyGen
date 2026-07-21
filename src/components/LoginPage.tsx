import React, { useState } from "react";
import { Lock, User, Sparkles, Star, Moon, Sun, GraduationCap, Eye, EyeOff } from "lucide-react";

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onRegister,
  darkMode,
  setDarkMode,
}) => {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = isRegistering 
        ? await onRegister(username.trim(), password)
        : await onLogin(username.trim(), password);

      if (!result.success) {
        setError(result.error || "An error occurred.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-center items-center relative overflow-hidden p-4 transition-colors duration-300 ${
      darkMode ? "bg-[#2D1B69] text-white" : "bg-indigo-50/50 text-[#2D1B69]"
    }`}>
      
      {/* Decorative stars */}
      {darkMode && (
        <>
          <div className="absolute top-10 left-10 w-1.5 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_8px_white] opacity-60 pointer-events-none animate-pulse-glow" />
          <div className="absolute top-1/4 right-20 w-1 h-1 bg-yellow-100 rounded-full shadow-[0_0_12px_white] opacity-50 pointer-events-none" />
          <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-white rounded-full opacity-70 pointer-events-none animate-star-float" />
          <div className="absolute bottom-10 right-12 w-1.5 h-1.5 bg-yellow-200 rounded-full opacity-60 pointer-events-none" />
        </>
      )}

      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
            darkMode 
              ? "border-white/10 bg-white/5 hover:bg-white/10 text-brand-secondary" 
              : "border-indigo-100 bg-white hover:bg-indigo-50 text-indigo-900 shadow-sm"
          }`}
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="p-4 bg-gradient-to-tr from-indigo-600 to-yellow-400 rounded-3xl shadow-xl flex items-center justify-center mb-4 animate-pulse-glow">
            <GraduationCap className="w-10 h-10 text-slate-950" />
          </div>
          <h1 className="font-display font-extrabold text-4xl tracking-tight bg-gradient-to-r from-indigo-400 via-yellow-300 to-cyan-300 bg-clip-text text-transparent mb-1">
            Study<span className="text-yellow-400">Gen</span>
          </h1>
          <p className={`text-xs uppercase tracking-widest font-semibold ${
            darkMode ? "text-indigo-200/80" : "text-slate-500"
          }`}>
            Intelligent Study Assistant ✨
          </p>
        </div>

        {/* Auth Card */}
        <div className={`rounded-3xl border p-8 transition-all duration-300 shadow-2xl backdrop-blur-md ${
          darkMode 
            ? "bg-[#3D2B85]/90 border-white/10 text-white shadow-[0_20px_50px_rgba(45,27,105,0.4)]" 
            : "bg-white border-indigo-100 text-[#2D1B69]"
        }`}>
          <h2 className="font-display font-bold text-2xl mb-6 text-center">
            {isRegistering ? "Create your Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                Username / Gmail Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 opacity-60">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. student@gmail.com or username"
                  className={`w-full py-3 pl-11 pr-4 rounded-xl text-sm border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    darkMode 
                      ? "bg-[#2D1B69]/75 border-white/10 text-white placeholder-indigo-300/40" 
                      : "bg-slate-50 border-indigo-100 text-indigo-950 placeholder-slate-400 focus:bg-white"
                  }`}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 opacity-60">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full py-3 pl-11 pr-11 rounded-xl text-sm border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    darkMode 
                      ? "bg-[#2D1B69]/75 border-white/10 text-white placeholder-indigo-300/40" 
                      : "bg-slate-50 border-indigo-100 text-indigo-950 placeholder-slate-400 focus:bg-white"
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 font-semibold text-center animate-pulse">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-sm font-extrabold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                loading
                  ? "bg-indigo-600/50 text-white/50 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20 hover:scale-[1.01]"
              }`}
            >
              {loading ? (
                <span>Loading...</span>
              ) : (
                <>
                  <span>{isRegistering ? "Register Account" : "Sign In"}</span>
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse-glow" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="mt-6 text-center text-xs">
            <span className="opacity-60">
              {isRegistering ? "Already have an account? " : "New to StudyGen? "}
            </span>
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer ml-1"
            >
              {isRegistering ? "Log In" : "Register Now"}
            </button>
          </div>
        </div>

        {/* Credentials Tip Board */}
        <div className={`mt-6 p-4 rounded-2xl border text-center text-xs space-y-1.5 ${
          darkMode 
            ? "bg-white/5 border-white/10 text-indigo-200" 
            : "bg-indigo-50/70 border-indigo-100 text-indigo-950"
        }`}>
          <div className="font-bold uppercase tracking-wider text-[10px] text-yellow-500 dark:text-yellow-400 mb-1">
            Demo Credentials
          </div>
          <div>
            👨‍🎓 Student User: <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono">student</code> / <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono">password123</code>
          </div>
          <div>
            🛡️ Admin User: <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono">admin</code> / <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono">admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
};
