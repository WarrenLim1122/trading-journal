import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Activity, Mail, Lock, Eye, EyeOff, Calendar } from "lucide-react";
import { SplineScene } from "../components/ui/splite";
import { Spotlight } from "../components/ui/spotlight";

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      if (isForgotPassword) {
        if (!email) {
          setError("Please enter your email address to reset your password.");
          setLoading(false);
          return;
        }
        await resetPassword(email);
        setSuccess("Password reset email sent! Please check your inbox.");
      } else if (isSignUp) {
        try {
          await signUpWithEmail(email, password, firstName, lastName, dateOfBirth);
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            try {
              await signInWithEmail(email, password);
            } catch (signInErr: any) {
              if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/wrong-password') {
                 throw new Error("This email is already associated with an account. If you originally signed up with Google, please use the 'Continue with Google' button.");
              }
              throw signInErr;
            }
          } else {
            throw err;
          }
        }
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
         setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
         setError("An account with this email already exists.");
      } else if (err.code === 'auth/weak-password') {
         setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/operation-not-allowed') {
         setError("Email/Password sign-in is not enabled. Please enable it in the Firebase Console Authentication settings.");
      } else if (err.code === 'auth/user-not-found') {
         setError("No account found with this email address.");
      } else if (err.code === 'auth/invalid-email') {
         setError("Please enter a valid email address.");
      } else {
         setError(err.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      // Ignore popup closed errors since the user just stopped the process manually
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Spotlight size={60} isGlobal={true} />
      
      {/* Background - 3D Spline Interactive Scene */}
      <div className="absolute inset-0 z-0 bg-black pointer-events-auto overflow-hidden flex items-center">
        {/* Spline Container shifted left */}
        <div className="absolute top-0 bottom-0 left-0 w-[120%] -translate-x-[10%] lg:w-[140%] lg:-translate-x-[25%] transition-transform duration-1000 ease-out">
          <SplineScene 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </div>
        {/* Gradient to darken the right side where the form sits, keeping the left side brighter for the bot */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/40 to-black/80 pointer-events-none" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col justify-end lg:flex-row min-h-screen pointer-events-none">
        
        {/* Left Side Content */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 text-white pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Activity className="h-6 w-6 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight font-mono">The Trading Journal</span>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4 tracking-tight drop-shadow-lg">Master the markets by mastering yourself.</h2>
            <p className="text-lg text-gray-200 font-mono drop-shadow-md">
              Log every trade, analyze your performance, and refine your edge with our professional journaling platform.
            </p>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end p-8 lg:pr-16 xl:pr-32 pointer-events-auto">
          <div className="mx-auto w-full max-w-sm flex flex-col justify-center space-y-6 bg-background/90 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex flex-col space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">
              {isForgotPassword ? "Reset password" : isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isForgotPassword
                ? "Enter your email below to receive a password reset link"
                : isSignUp 
                  ? "Enter your email below to create your account" 
                  : "Enter your email to sign in to your account"}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 text-green-500 text-sm p-3 rounded-md border border-green-500/20 font-medium">
              {success}
            </div>
          )}

          <div className="grid gap-6">
            <form onSubmit={handleSubmit} className="grid gap-4">
              {isSignUp && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        placeholder="Michael" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={isSignUp}
                        disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Jackson" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={isSignUp}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input 
                        id="dob" 
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required={isSignUp}
                        disabled={loading}
                        className="pl-10 cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0"
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className={isSignUp ? "" : "sr-only"}>Email</Label>
                <div className="relative">
                   <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                   <Input 
                     id="email" 
                     type="email" 
                     placeholder="name@example.com" 
                     className="pl-9"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     required
                     disabled={loading}
                   />
                </div>
              </div>
              {!isForgotPassword && (
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className={isSignUp ? "" : "sr-only"}>Password</Label>
                    {!isSignUp && (
                      <button 
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(""); setSuccess(""); }}
                        className="ml-auto inline-block text-xs text-muted-foreground underline-offset-4 hover:underline cursor-pointer"
                      >
                        Forgot your password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                     <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                     <Input 
                       id="password" 
                       type={showPassword ? "text" : "password"}
                       placeholder="••••••••" 
                       className="pl-9 pr-10"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       required={!isForgotPassword}
                       disabled={loading}
                     />
                     <button
                       type="button"
                       className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                       onClick={() => setShowPassword(!showPassword)}
                       tabIndex={-1}
                     >
                       {showPassword ? (
                         <EyeOff className="h-5 w-5" />
                       ) : (
                         <Eye className="h-5 w-5" />
                       )}
                     </button>
                  </div>
                </div>
              )}
              <Button disabled={loading} type="submit" className="w-full font-semibold">
                {loading ? "Please wait..." : isForgotPassword ? "Reset Password" : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>
            
            {!isForgotPassword && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground font-mono">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button disabled={loading} variant="outline" type="button" onClick={handleGoogleSignIn} className="w-full gap-2 font-medium">
                   <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                     <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                     <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                     <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                     <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 20.0654 20.965L16.0804 18.09C14.9004 18.875 13.5654 19.32 12.0004 19.32C8.8704 19.32 6.21537 17.21 5.27037 14.365L1.27539 17.46C3.25539 21.38 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                   </svg>
                   Google
                </Button>
              </>
            )}
          </div>

            <p className="text-center text-sm text-muted-foreground border-t border-white/5 pt-4">
              {isForgotPassword ? (
                <>
                  Remember your password?{" "}
                  <button 
                    onClick={() => { setIsForgotPassword(false); setIsSignUp(false); setError(""); setSuccess(""); }}
                    className="underline underline-offset-4 hover:text-primary font-medium cursor-pointer"
                  >
                    Back to login
                  </button>
                </>
              ) : (
                <>
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
                    className="underline underline-offset-4 hover:text-primary font-medium cursor-pointer"
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </button>
                </>
              )}
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
