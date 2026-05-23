"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-10 text-red-500 flex flex-col items-center justify-center min-h-screen bg-black">
      <h2 className="text-2xl font-bold mb-4">Giao diện bị lỗi: {error.message}</h2>
      <button 
        onClick={() => reset()} 
        className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
      >
        Thử tải lại
      </button>
    </div>
  );
}
