import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* ElectraGH Logo */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-2xl shadow-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
        </div>

        <h1 className="text-6xl font-bold text-electra-primary mb-4 drop-shadow-sm">404</h1>
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-electra-primary to-electra-secondary bg-clip-text text-transparent mb-4">
          Page Not Found
        </h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          The page you are looking for could not be found. Please check the URL or return to the ElectraGH homepage.
        </p>

        <a
          href="/"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-electra-primary to-electra-secondary text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-electra-secondary hover:to-electra-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return Home
        </a>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-electra-primary/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-electra-secondary/10 rounded-full blur-xl"></div>
      </div>
    </div>
  );
}