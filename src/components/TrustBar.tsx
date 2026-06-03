import React from 'react';
import './TrustBar.css';
import { getRelationshipStage } from '../engine/relationshipMilestones';

interface TrustBarProps {
  trustLevel: number;
  satisfactionLevel: number;
}

const TrustBar: React.FC<TrustBarProps> = ({ trustLevel, satisfactionLevel }) => {
  const getTrustLabel = () => {
    return getRelationshipStage(trustLevel).label;
  };

  const getSatisfactionLabel = () => {
    if (satisfactionLevel < 30) return '不满';
    if (satisfactionLevel < 50) return '一般';
    if (satisfactionLevel < 70) return '满意';
    return '很满意';
  };

  return (
    <div className="trust-bar-container">
      <div className="trust-item">
        <div className="label">信任度</div>
        <div className="bar-bg">
          <div
            className="bar-fill trust"
            style={{ width: `${trustLevel}%` }}
          ></div>
        </div>
        <div className="percentage">
          {trustLevel}% · {getTrustLabel()}
        </div>
      </div>

      <div className="trust-item">
        <div className="label">满意度</div>
        <div className="bar-bg">
          <div
            className="bar-fill satisfaction"
            style={{ width: `${satisfactionLevel}%` }}
          ></div>
        </div>
        <div className="percentage">
          {satisfactionLevel}% · {getSatisfactionLabel()}
        </div>
      </div>
    </div>
  );
};

export default TrustBar;
