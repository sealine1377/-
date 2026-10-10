'use client';

interface RatingSectionProps {
  avgRating: number;
  ratingCount: number;
  userRating: number;
  hasRated: boolean;
  onRate: (score: number) => void;
}

export default function RatingSection({
  avgRating,
  ratingCount,
  userRating,
  hasRated,
  onRate,
}: RatingSectionProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-gray-800">체감 난이도 평가</h3>
        {hasRated && <span className="text-[11px] font-bold text-green-600">✓ 평가 완료</span>}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl font-extrabold text-amber-500">
          {avgRating > 0 ? avgRating : '-'}
        </span>
        <div className="text-xs text-gray-500">
          <p className="font-medium text-gray-700">평균 체감 난이도</p>
          <p>총 {ratingCount}명 참여</p>
        </div>
      </div>

      <div className="flex gap-1 pt-2 border-t">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(star)}
            className={`flex-1 py-1.5 text-xs font-bold rounded border transition ${
              userRating >= star
                ? 'bg-amber-400 text-white border-amber-400'
                : 'bg-white text-gray-600 hover:bg-amber-50 border-gray-200'
            }`}
          >
            ★ {star}
          </button>
        ))}
      </div>
    </div>
  );
}