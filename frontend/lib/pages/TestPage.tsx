export default function TestPage() {
  return (
    <div style={{ 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '50px',
      fontSize: '30px',
      minHeight: '100vh'
    }}>
      <h1>TEST PAGE - IF YOU SEE THIS, REACT IS WORKING!</h1>
      <p>Background should be RED</p>
      <p>Text should be WHITE</p>
      <button onClick={() => alert('Button works!')}>Click Me</button>
    </div>
  );
}

