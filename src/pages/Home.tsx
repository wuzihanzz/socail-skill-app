import React from 'react';
import { useNavigate } from 'react-router-dom';
import tips from '../data/tips';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">社交技能修炼</h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto leading-relaxed">
            通过和真实的AI角色聊天，学习如何更好地与他人沟通
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Tips Section */}
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wider mb-3">
            💡 社交技巧
          </h2>
          <div className="space-y-3">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="text-2xl flex-shrink-0 w-8 text-center">{tip.icon}</div>
                <div className="min-w-0">
                  <div className="text-xs text-purple-500 font-semibold uppercase tracking-wide mb-0.5">
                    {tip.category}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 mb-1">{tip.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed mb-2">{tip.description}</div>
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1.5 leading-relaxed">
                    <span className="font-medium">例如：</span>{tip.example}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-center text-white">
          <h2 className="text-lg font-bold mb-2">准备好了吗？</h2>
          <p className="text-sm text-white/80 mb-4 leading-relaxed">
            选择一个角色，开始和他们聊天。<br />你的沟通方式会影响他们对你的看法。
          </p>
          <button
            onClick={() => navigate('/characters')}
            className="bg-white text-purple-600 font-bold text-sm px-6 py-3 rounded-xl hover:bg-purple-50 active:scale-95 transition-all"
          >
            选择角色 →
          </button>
        </section>
      </main>
    </div>
  );
};

export default Home;
