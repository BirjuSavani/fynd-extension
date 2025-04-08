import React from 'react';

export function ProductCard({ transcript, listening, toggleListening }) {
  return (
    <div>
      <button onClick={toggleListening}>{listening ? 'Stop Listening' : 'Start Speaking'}</button>
      {transcript && <p>Heard: {transcript}</p>}
    </div>
  );
}
