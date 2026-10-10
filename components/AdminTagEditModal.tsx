'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminTagEditModalProps {
  questionId: string;
  initialData: {
    year: number;
    exam_type: string;
    category: string;
    sub_category: string;
  };
  attachedSkillIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Tag {
  id: string;
  name: string;
}

export default function AdminTagEditModal({
  questionId,
  initialData,
  attachedSkillIds,
  isOpen,
  onClose,
  onSuccess,
}: AdminTagEditModalProps) {
  const [year, setYear] = useState(initialData.year);
  const [examType, setExamType] = useState(initialData.exam_type);
  const [category, setCategory] = useState(initialData.category);
  const [subCategory, setSubCategory] = useState(initialData.sub_category);

  const [allTier3Tags, setAllTier3Tags] = useState<Tag[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(attachedSkillIds);
  const [newSkillName, setNewSkillName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTier3Tags();
      setSelectedSkills(attachedSkillIds);
    }
  }, [isOpen, attachedSkillIds]);

  const fetchTier3Tags = async () => {
    const { data } = await supabase.from('tags').select('*').eq('tier', 3);
    if (data) {
      setAllTier3Tags(
        data.map((t) => ({ id: t.id, name: t.tag_name || t.name || '' }))
      );
    }
  };

  const handleToggleSkill = (tagId: string) => {
    if (selectedSkills.includes(tagId)) {
      setSelectedSkills(selectedSkills.filter((id) => id !== tagId));
    } else {
      setSelectedSkills([...selectedSkills, tagId]);
    }
  };

  // 3차 태그 생성 핸들러 (수정 완료)
  const handleAddNewTier3Skill = async () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from('tags')
      .insert([{ name: trimmed, tag_name: trimmed, tier: 3 }])
      .select('*')
      .single();

    if (error) {
      console.error('3차 태그 생성 오류:', error);
      alert(`태그 생성 실패: ${error.message}`);
      return;
    }

    if (data) {
      const createdTag = { id: data.id, name: data.tag_name || data.name || trimmed };
      setAllTier3Tags((prev) => [...prev, createdTag]);
      setSelectedSkills((prev) => [...prev, createdTag.id]);
      setNewSkillName('');
    }
  };

  const handleSave = async () => {
    setSaving(true);

    await supabase
      .from('questions')
      .update({
        year: Number(year),
        exam_type: examType,
        category,
        sub_category: subCategory,
      })
      .eq('id', questionId);

    await supabase.from('question_official_tags').delete().eq('question_id', questionId);

    if (selectedSkills.length > 0) {
      const insertRows = selectedSkills.map((sId) => ({
        question_id: questionId,
        tag_id: sId,
      }));
      await supabase.from('question_official_tags').insert(insertRows);
    }

    setSaving(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-xl">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-bold text-gray-900">⚙️ 1·2·3차 태그 및 정보 수정 (관리자)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black">✕</button>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase">1차(시행 정보) & 2차(표면 주제)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">시행 연도</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">시험 구분</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm bg-white"
              >
                <option value="수능">수능</option>
                <option value="6월모의">6월 모의고사</option>
                <option value="9월모의">9월 모의고사</option>
                <option value="LEET">LEET</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">2차 표면 주제</label>
            <input
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="예: 사회(경제), 과학, 법, 철학"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <h3 className="text-xs font-bold text-gray-500 uppercase">3차 공식 독해 능력 태그 선택</h3>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {allTier3Tags.map((tag) => {
              const isChecked = selectedSkills.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleSkill(tag.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border transition ${
                    isChecked
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isChecked ? '✓ ' : ''}#{tag.name}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="+ 신규 3차 능력 입력"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="flex-1 p-1.5 border rounded-lg text-xs"
            />
            <button
              type="button"
              onClick={handleAddNewTier3Skill}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
            >
              생성
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border rounded-xl font-bold text-xs text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? '저장 중...' : '수정 사항 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}