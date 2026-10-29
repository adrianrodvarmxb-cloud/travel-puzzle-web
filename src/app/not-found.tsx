import { Navbar } from '@/components/layout/Navbar';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background relative">
            <Navbar />
            <div
                className="relative min-h-[calc(100vh-64px)] flex justify-center pt-16"
                style={{
                    backgroundImage: 'url(/404-background.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {/* Content */}
                <div className="relative z-10 text-center px-4 text-white">
                    <h1 className="text-6xl font-bold mb-4">404</h1>
                    <p className="text-xl">Page not found</p>
                </div>
            </div>
        </div>
    );
}

