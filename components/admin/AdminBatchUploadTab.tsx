'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ParsedFileItem {
  id: string;
  file: File;
  title: string;
  year: number | '';
  examType: string;
  category: string;
  subCategory: string;
}

interface AdminBatchUploadTabProps {
  onSuccess: () => void;
}

export default function AdminBatchUploadTab({ onSuccess }: AdminBatchUploadTabProps) {
  const [parsedFiles, setParsedFiles] = useState<ParsedFileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: ParsedFileItem[] = files.map((file, idx) => {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim();
      const match = fileNameWithoutExt.match(/^(\d{2})(\d{2})\s*(.*)$/);

      let parsedYear: number | '' = '';
      let parsedExamType = '';

      if (match) {
        const [, yy, mm] = match;
        parsedYear = 2000 + parseInt(yy, 10);

        const monthNum = parseInt(mm, 10);
        if (monthNum === 6) parsedExamType = '6월모의';
        else if (monthNum === 9) parsedExamType = '9월모의';
        else if (monthNum === 11) parsedExamType = '수능';
        else parsedExamType = '';
      }

      return {
        id: `${file.name}-${Date.now()}-${idx}`,
        file,
        title: fileNameWithoutExt,
        year: parsedYear,
        examType: parsedExamType,
        category: '독서',
        subCategory: '',
      };
    });

    setParsedFiles(newItems);
    setStatusMsg('');
  };

  const handleUpdateParsedItem = (id: string, field: keyof ParsedFileItem, value: any) => {
    setParsedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveParsedItem = (id: string) => {
    setParsedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedFiles.length === 0) {
      alert('업로드할 PDF 파일을 선택해 주세요.');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < parsedFiles.length; i++) {
      const item = parsedFiles[i];
      setStatusMsg(`⏳ 업로드 진행 중 (${i + 1}/${parsedFiles.length}): ${item.title}`);

      try {
        const fileExt = item.file.name.split('.').pop();
        const uniqueFileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `passages/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage.from('pdfs').upload(filePath, item.file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('questions').insert([
          {
            title: item.title,
            year: item.year ? Number(item.year) : null,
            exam_type: item.examType || '미지정',
            category: item.category || '독서',
            sub_category: item.subCategory || '',
            pdf_url: urlData.publicUrl,
          },
        ]);

        if (dbError) throw dbError;
        successCount++;
      } catch (err: any) {
        console.error(`파일 업로드 실패 [${item.title}]:`, err);
        failCount++;
      }
    }

    setStatusMsg(`🎉 일괄 업로드 완료! (성공: ${successCount}개, 실패: ${failCount}개)`);
    setParsedFiles([]);
    setUploading(false);
    onSuccess();
  };

  return (
    <section className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
      <div className="border-b pb-3">
        <h2 className="text-lg font-bold text-gray-800">📥 지문 일괄 다중 업로드 (자동 파싱)</h2>
        <p className="text-xs text-gray-500 mt-1">
          여러 개의 PDF 파일을 한 번에 선택할 수 있습니다. 2차/3차 태그는 공란으로 설정됩니다.
        </p>
      </div>

      <form onSubmit={handleBatchUpload} className="space-y-6">
        <div>
          <label className="block text-xs font-bold mb-2 text-gray-700">
            PDF 지문 파일 다중 선택 (Ctrl / Shift 지원) *
          </label>
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleMultiFileChange}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-sm bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
          />
          <p className="text-[11px] text-gray-400 mt-1.5">
            💡 예시: <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-600">1806 수기치인.pdf</code> ➔ [2018년], [6월모의], [1806 수기치인] 자동 파싱
          </p>
        </div>

        {parsedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-700">
                📋 일괄 업로드 대기 목록 ({parsedFiles.length}개)
              </h3>
              <button
                type="button"
                onClick={() => setParsedFiles([])}
                className="text-xs text-red-500 hover:underline font-bold"
              >
                목록 전체 비우기
              </button>
            </div>

            <div className="border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b font-bold text-gray-600">
                    <th className="p-2.5">지문 제목</th>
                    <th className="p-2.5 w-24">시행 연도</th>
                    <th className="p-2.5 w-32">시험 구분 (1차)</th>
                    <th className="p-2.5 w-24">2차 태그</th>
                    <th className="p-2.5 w-16 text-center">취소</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-800">
                  {parsedFiles.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateParsedItem(item.id, 'title', e.target.value)}
                          className="w-full p-1.5 border rounded font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.year}
                          onChange={(e) =>
                            handleUpdateParsedItem(
                              item.id,
                              'year',
                              e.target.value === '' ? '' : Number(e.target.value)
                            )
                          }
                          placeholder="연도"
                          className="w-full p-1.5 border rounded text-blue-700 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={item.examType}
                          onChange={(e) => handleUpdateParsedItem(item.id, 'examType', e.target.value)}
                          className="w-full p-1.5 border rounded bg-white text-blue-700 font-bold"
                        >
                          <option value="">-- 선택 --</option>
                          <option value="수능">수능</option>
                          <option value="6월모의">6월 모의고사</option>
                          <option value="9월모의">9월 모의고사</option>
                          <option value="LEET">LEET</option>
                        </select>
                      </td>
                      <td className="p-2 text-gray-400 font-medium text-center">(공란)</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveParsedItem(item.id)}
                          className="text-red-500 font-bold hover:bg-red-50 p-1 rounded"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || parsedFiles.length === 0}
          className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition shadow-sm"
        >
          {uploading ? '지문들 업로드 중...' : `선택된 ${parsedFiles.length}개 지문 최종 일괄 업로드`}
        </button>

        {statusMsg && (
          <p className="text-center text-xs font-bold text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
            {statusMsg}
          </p>
        )}
      </form>
    </section>
  );
}