export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-glass w-full max-w-md p-8">
        {children}
      </div>
    </div>
  );
}
