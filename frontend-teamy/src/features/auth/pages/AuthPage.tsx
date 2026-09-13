import { motion } from "motion/react";
import { GoogleLoginButton } from "../components/GoogleLoginButton";

type AuthPageProps = {
  onGoogleAuthenticate: () => void;
};

function AuthPage({ onGoogleAuthenticate }: AuthPageProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] p-4 text-[#e4e1e7] antialiased">
      {/* Animated Background Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{
            x: ["0%", "10%", "-5%", "0%"],
            y: ["0%", "-10%", "5%", "0%"],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-10%] left-[-10%] h-[60%] w-[60%] rounded-full bg-indigo-600/10 blur-[120px]"
        />
        <motion.div
          animate={{
            x: ["0%", "-10%", "5%", "0%"],
            y: ["0%", "10%", "-5%", "0%"],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute right-[-10%] bottom-[-10%] h-[50%] w-[50%] rounded-full bg-blue-600/10 blur-[100px]"
        />
      </div>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-105">
        <header className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <img src="/favicon.png" alt="Teamy logo" className="size-16 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.25)]" />
            <h1 className="m-0 bg-linear-to-br from-white via-white to-white/50 bg-clip-text pb-1 text-5xl font-extrabold tracking-tight text-transparent">Teamy</h1>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="mt-3 text-lg font-medium text-zinc-400">
            Welcome back
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/2 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-linear-to-b before:from-white/4 before:to-transparent"
        >
          <div className="flex flex-col gap-8">
            <div className="space-y-3 text-center">
              <h2 className="text-xl font-semibold text-zinc-100">Sign in to Teamy</h2>
              <p className="text-sm leading-relaxed text-zinc-400">Continue with Google to access your workspace. New users are created automatically.</p>
            </div>

            <GoogleLoginButton onClick={onGoogleAuthenticate} />
          </div>
        </motion.div>
      </motion.section>
    </main>
  );
}

export default AuthPage;
