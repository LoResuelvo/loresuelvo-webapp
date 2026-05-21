export function AmbientGlows() {
  return (
    <>
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200/20 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[550px] h-[550px] rounded-full bg-teal-100/25 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[15%] w-[450px] h-[450px] rounded-full bg-amber-100/35 blur-[120px] pointer-events-none" />
    </>
  );
}
