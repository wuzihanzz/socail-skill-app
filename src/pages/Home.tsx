import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Tip } from '../types/index';
import tips from '../data/tips';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>社交技能修炼</h1>
        <p>通过和真实的AI角色聊天，学习如何更好地与他人沟通</p>
      </header>

      <section className="tips-section">
        <h2>💡 社交技巧</h2>
        <div className="tips-grid">
          {tips.map((tip) => (
            <div key={tip.id} className="tip-card">
              <div className="tip-icon">{tip.icon}</div>
              <div className="tip-content">
                <div className="tip-category">{tip.category}</div>
                <div className="tip-title">{tip.title}</div>
                <div className="tip-description">{tip.description}</div>
                <div className="tip-example">
                  <strong>例子：</strong> {tip.example}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <h2>准备好开始吗？</h2>
        <p>选择一个角色，开始和他们聊天。你的沟通方式会影响他们对你的看法。</p>
        <button className="cta-button" onClick={() => navigate('/characters')}>
          去选择角色 →
        </button>
      </section>
    </div>
  );
};

export default Home;
