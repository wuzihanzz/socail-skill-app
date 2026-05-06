import React from 'react';
import './PixelAvatar.css';

interface PixelAvatarProps {
  characterId: string;
  emotion: 'neutral' | 'happy' | 'upset';
  name: string;
}

const PixelAvatar: React.FC<PixelAvatarProps> = ({
  characterId,
  emotion,
}) => {
  // Lin Xue - Designer with purple hair (like Okami reference)
  if (characterId === 'lin-xue') {
    return (
      <svg viewBox="0 0 160 200" className={`pixel-avatar lin-xue ${emotion}`}>
        {/* Purple wavy hair */}
        <g id="hair">
          <rect x="25" y="20" width="8" height="8" fill="#8b3fbf" />
          <rect x="33" y="15" width="8" height="12" fill="#8b3fbf" />
          <rect x="41" y="10" width="8" height="16" fill="#9d4fc9" />
          <rect x="49" y="8" width="8" height="18" fill="#a85fd3" />
          <rect x="57" y="5" width="8" height="20" fill="#9d4fc9" />
          <rect x="65" y="5" width="8" height="20" fill="#a85fd3" />
          <rect x="73" y="5" width="8" height="20" fill="#9d4fc9" />
          <rect x="81" y="8" width="8" height="18" fill="#a85fd3" />
          <rect x="89" y="10" width="8" height="16" fill="#9d4fc9" />
          <rect x="97" y="15" width="8" height="12" fill="#8b3fbf" />
          <rect x="105" y="20" width="8" height="8" fill="#8b3fbf" />

          {/* Hair volume on sides - wavy effect */}
          <rect x="20" y="30" width="8" height="12" fill="#8b3fbf" />
          <rect x="132" y="30" width="8" height="12" fill="#8b3fbf" />
          <rect x="15" y="42" width="8" height="8" fill="#7a2eb5" />
          <rect x="137" y="42" width="8" height="8" fill="#7a2eb5" />
        </g>

        {/* Head - Round and cute */}
        <g id="head">
          <rect x="35" y="28" width="90" height="70" fill="#f5d5b8" />
          <rect x="30" y="40" width="8" height="40" fill="#f5d5b8" />
          <rect x="122" y="40" width="8" height="40" fill="#f5d5b8" />
        </g>

        {/* Eyes - Big and expressive */}
        {emotion === 'happy' && (
          <g id="eyes-happy">
            {/* Left eye */}
            <rect x="45" y="50" width="16" height="18" fill="#e8f5e9" />
            <rect x="47" y="52" width="12" height="14" fill="#00dd88" />
            <rect x="52" y="57" width="6" height="8" fill="#000000" />
            <rect x="55" y="60" width="2" height="2" fill="#ffffff" />
            {/* Right eye */}
            <rect x="99" y="50" width="16" height="18" fill="#e8f5e9" />
            <rect x="101" y="52" width="12" height="14" fill="#00dd88" />
            <rect x="102" y="57" width="6" height="8" fill="#000000" />
            <rect x="105" y="60" width="2" height="2" fill="#ffffff" />
          </g>
        )}

        {emotion === 'upset' && (
          <g id="eyes-upset">
            {/* Left eye - slanted */}
            <rect x="45" y="50" width="16" height="16" fill="#ffb3d9" />
            <rect x="48" y="52" width="10" height="12" fill="#ff1493" />
            <rect x="50" y="56" width="6" height="4" fill="#000000" />
            {/* Right eye - slanted */}
            <rect x="99" y="50" width="16" height="16" fill="#ffb3d9" />
            <rect x="102" y="52" width="10" height="12" fill="#ff1493" />
            <rect x="104" y="56" width="6" height="4" fill="#000000" />
          </g>
        )}

        {emotion === 'neutral' && (
          <g id="eyes-neutral">
            {/* Left eye */}
            <rect x="45" y="52" width="14" height="12" fill="#e8f5e9" />
            <rect x="48" y="54" width="8" height="8" fill="#333333" />
            {/* Right eye */}
            <rect x="101" y="52" width="14" height="12" fill="#e8f5e9" />
            <rect x="104" y="54" width="8" height="8" fill="#333333" />
          </g>
        )}

        {/* Nose - Small */}
        <rect x="77" y="70" width="6" height="4" fill="#e8c4a0" />

        {/* Mouth */}
        {emotion === 'happy' && (
          <g id="mouth-happy">
            <rect x="72" y="78" width="4" height="6" fill="#ff1493" />
            <rect x="76" y="80" width="8" height="6" fill="#ff1493" />
            <rect x="84" y="78" width="4" height="6" fill="#ff1493" />
          </g>
        )}

        {emotion === 'upset' && (
          <g id="mouth-upset">
            <rect x="74" y="82" width="12" height="3" fill="#ff6b9d" />
          </g>
        )}

        {emotion === 'neutral' && (
          <g id="mouth-neutral">
            <rect x="74" y="82" width="12" height="3" fill="#d9524f" />
          </g>
        )}

        {/* Neck */}
        <rect x="65" y="98" width="30" height="6" fill="#f5d5b8" />

        {/* Black dress/top */}
        <g id="outfit">
          <rect x="40" y="104" width="80" height="12" fill="#1a1a2e" />
          {/* Blue accent stripe */}
          <rect x="50" y="116" width="60" height="4" fill="#0052cc" />
          <rect x="35" y="120" width="90" height="40" fill="#1a1a2e" />
          <rect x="30" y="160" width="100" height="20" fill="#1a1a2e" />
        </g>

        {/* Arms */}
        <rect x="15" y="130" width="12" height="35" fill="#f5d5b8" />
        <rect x="133" y="130" width="12" height="35" fill="#f5d5b8" />

        {/* Hands */}
        <rect x="12" y="165" width="14" height="10" fill="#f5d5b8" />
        <rect x="134" y="165" width="14" height="10" fill="#f5d5b8" />
      </svg>
    );
  }

  // Chen Wei - Lawyer in blue suit (like Penny reference)
  if (characterId === 'chen-wei') {
    return (
      <svg viewBox="0 0 160 200" className={`pixel-avatar chen-wei ${emotion}`}>
        {/* Dark hair - neat and professional */}
        <g id="hair">
          <rect x="35" y="15" width="90" height="22" fill="#1a1a1a" />
          <rect x="28" y="28" width="8" height="18" fill="#1a1a1a" />
          <rect x="124" y="28" width="8" height="18" fill="#1a1a1a" />
          <rect x="30" y="37" width="8" height="8" fill="#0d0d0d" />
          <rect x="122" y="37" width="8" height="8" fill="#0d0d0d" />
        </g>

        {/* Head - Round */}
        <g id="head">
          <rect x="35" y="35" width="90" height="65" fill="#e8b8a0" />
          <rect x="28" y="45" width="8" height="45" fill="#e8b8a0" />
          <rect x="124" y="45" width="8" height="45" fill="#e8b8a0" />
        </g>

        {/* Eyes - Clear and serious */}
        {emotion === 'happy' && (
          <g id="eyes-happy">
            {/* Left eye */}
            <rect x="45" y="55" width="14" height="14" fill="#ffffff" />
            <rect x="48" y="58" width="8" height="8" fill="#2c2c2c" />
            <rect x="51" y="61" width="2" height="2" fill="#ffffff" />
            {/* Right eye */}
            <rect x="101" y="55" width="14" height="14" fill="#ffffff" />
            <rect x="104" y="58" width="8" height="8" fill="#2c2c2c" />
            <rect x="107" y="61" width="2" height="2" fill="#ffffff" />
          </g>
        )}

        {emotion === 'upset' && (
          <g id="eyes-upset">
            {/* Left eye - angry */}
            <rect x="45" y="55" width="14" height="12" fill="#ffb3b3" />
            <rect x="48" y="57" width="8" height="8" fill="#8b3a3a" />
            <rect x="45" y="52" width="12" height="3" fill="#8b3a3a" />
            {/* Right eye - angry */}
            <rect x="101" y="55" width="14" height="12" fill="#ffb3b3" />
            <rect x="104" y="57" width="8" height="8" fill="#8b3a3a" />
            <rect x="103" y="52" width="12" height="3" fill="#8b3a3a" />
          </g>
        )}

        {emotion === 'neutral' && (
          <g id="eyes-neutral">
            {/* Left eye */}
            <rect x="47" y="60" width="10" height="6" fill="#2c2c2c" />
            {/* Right eye */}
            <rect x="103" y="60" width="10" height="6" fill="#2c2c2c" />
          </g>
        )}

        {/* Nose - Simple */}
        <rect x="77" y="72" width="6" height="4" fill="#d9a08c" />

        {/* Mouth */}
        {emotion === 'happy' && (
          <g id="mouth-happy">
            <rect x="70" y="80" width="4" height="6" fill="#ff9999" />
            <rect x="74" y="82" width="12" height="4" fill="#ff9999" />
            <rect x="86" y="80" width="4" height="6" fill="#ff9999" />
          </g>
        )}

        {emotion === 'upset' && (
          <g id="mouth-upset">
            <rect x="74" y="84" width="12" height="3" fill="#8b3a3a" />
          </g>
        )}

        {emotion === 'neutral' && (
          <g id="mouth-neutral">
            <rect x="74" y="84" width="12" height="3" fill="#666666" />
          </g>
        )}

        {/* Neck */}
        <rect x="65" y="100" width="30" height="6" fill="#e8b8a0" />

        {/* Blue suit */}
        <g id="suit">
          <rect x="40" y="106" width="80" height="14" fill="#003d7a" />
          <rect x="35" y="120" width="90" height="40" fill="#003d7a" />
          <rect x="30" y="160" width="100" height="20" fill="#003d7a" />
        </g>

        {/* White shirt */}
        <rect x="65" y="106" width="30" height="12" fill="#ffffff" />

        {/* Arms */}
        <rect x="15" y="135" width="12" height="40" fill="#e8b8a0" />
        <rect x="133" y="135" width="12" height="40" fill="#e8b8a0" />

        {/* Hands */}
        <rect x="12" y="175" width="14" height="8" fill="#e8b8a0" />
        <rect x="134" y="175" width="14" height="8" fill="#e8b8a0" />
      </svg>
    );
  }

  // Xiao Mei - Nurse (cute style like reference)
  if (characterId === 'xiao-mei') {
    return (
      <svg viewBox="0 0 160 200" className={`pixel-avatar xiao-mei ${emotion}`}>
        {/* Nurse cap - White */}
        <g id="cap">
          <rect x="40" y="12" width="80" height="8" fill="#ffffff" />
          <rect x="35" y="20" width="90" height="4" fill="#ffffff" />
          {/* Pink band */}
          <rect x="40" y="24" width="80" height="3" fill="#ff6b9d" />
        </g>

        {/* Brown hair */}
        <g id="hair">
          <rect x="35" y="27" width="90" height="14" fill="#8b6914" />
          <rect x="28" y="35" width="8" height="20" fill="#8b6914" />
          <rect x="124" y="35" width="8" height="20" fill="#8b6914" />
          <rect x="25" y="50" width="8" height="10" fill="#7a5a0a" />
          <rect x="127" y="50" width="8" height="10" fill="#7a5a0a" />
        </g>

        {/* Head - Round and friendly */}
        <g id="head">
          <rect x="35" y="40" width="90" height="60" fill="#f5d5b8" />
          <rect x="28" y="50" width="8" height="40" fill="#f5d5b8" />
          <rect x="124" y="50" width="8" height="40" fill="#f5d5b8" />
        </g>

        {/* Eyes - Warm and kind */}
        {emotion === 'happy' && (
          <g id="eyes-happy">
            {/* Left eye */}
            <rect x="45" y="58" width="14" height="14" fill="#e8f5e9" />
            <rect x="48" y="61" width="8" height="8" fill="#333333" />
            <rect x="51" y="64" width="2" height="2" fill="#ffb6d9" />
            {/* Right eye */}
            <rect x="101" y="58" width="14" height="14" fill="#e8f5e9" />
            <rect x="104" y="61" width="8" height="8" fill="#333333" />
            <rect x="107" y="64" width="2" height="2" fill="#ffb6d9" />
          </g>
        )}

        {emotion === 'upset' && (
          <g id="eyes-upset">
            {/* Left eye - sad */}
            <rect x="45" y="58" width="14" height="12" fill="#ffb3d9" />
            <rect x="48" y="60" width="8" height="8" fill="#666666" />
            <rect x="48" y="56" width="8" height="3" fill="#333333" />
            {/* Right eye - sad */}
            <rect x="101" y="58" width="14" height="12" fill="#ffb3d9" />
            <rect x="104" y="60" width="8" height="8" fill="#666666" />
            <rect x="104" y="56" width="8" height="3" fill="#333333" />
          </g>
        )}

        {emotion === 'neutral' && (
          <g id="eyes-neutral">
            {/* Left eye */}
            <rect x="47" y="64" width="10" height="6" fill="#333333" />
            {/* Right eye */}
            <rect x="103" y="64" width="10" height="6" fill="#333333" />
          </g>
        )}

        {/* Nose */}
        <rect x="77" y="76" width="6" height="4" fill="#e8c4a0" />

        {/* Mouth - Gentle */}
        {emotion === 'happy' && (
          <g id="mouth-happy">
            <rect x="70" y="84" width="4" height="6" fill="#ffb6d9" />
            <rect x="74" y="86" width="12" height="4" fill="#ffb6d9" />
            <rect x="86" y="84" width="4" height="6" fill="#ffb6d9" />
          </g>
        )}

        {emotion === 'upset' && (
          <g id="mouth-upset">
            <rect x="76" y="88" width="4" height="3" fill="#ff6b9d" />
            <rect x="84" y="88" width="4" height="3" fill="#ff6b9d" />
          </g>
        )}

        {emotion === 'neutral' && (
          <g id="mouth-neutral">
            <rect x="74" y="88" width="12" height="3" fill="#333333" />
          </g>
        )}

        {/* Neck */}
        <rect x="65" y="100" width="30" height="6" fill="#f5d5b8" />

        {/* Nurse uniform - White */}
        <g id="uniform">
          <rect x="40" y="106" width="80" height="12" fill="#ffffff" />
          <rect x="35" y="118" width="90" height="40" fill="#ffffff" />
          <rect x="30" y="158" width="100" height="22" fill="#ffffff" />
        </g>

        {/* Pink accent stripe */}
        <rect x="50" y="128" width="60" height="4" fill="#ff6b9d" />

        {/* Red cross on chest */}
        <g id="cross">
          <rect x="75" y="140" width="10" height="20" fill="#ff0000" />
          <rect x="70" y="145" width="20" height="10" fill="#ff0000" />
        </g>

        {/* Arms */}
        <rect x="15" y="140" width="12" height="35" fill="#f5d5b8" />
        <rect x="133" y="140" width="12" height="35" fill="#f5d5b8" />

        {/* Hands */}
        <rect x="12" y="175" width="14" height="8" fill="#f5d5b8" />
        <rect x="134" y="175" width="14" height="8" fill="#f5d5b8" />
      </svg>
    );
  }

  return null;
};

export default PixelAvatar;
