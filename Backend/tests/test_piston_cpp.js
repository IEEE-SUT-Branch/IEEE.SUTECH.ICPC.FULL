async function main() {
  const payload = {
    language: "c++",
    version: "10.2.0",
    files: [
      {
        name: "main.cpp",
        content:
          "#include <iostream>\nusing namespace std;\nint main(){ long long a,b; if(!(cin>>a>>b)) return 0; cout << (a+b) << '\\n'; return 0; }",
      },
    ],
    stdin: "1 2\n",
    compile_timeout: 20000,
    run_timeout: 2000,
    compile_memory_limit: 268435456,
    run_memory_limit: 268435456,
  };

  const res = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log(`status=${res.status}`);
  console.log(text.slice(0, 600));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
