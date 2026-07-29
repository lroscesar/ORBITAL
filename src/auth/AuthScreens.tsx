const submit = async (e: React.FormEvent) => {
  e.preventDefault()
  setErr(""); setOk("")
  if (!nome.trim()) { setErr("Nome é obrigatório."); return }
  if (senha.length < 6) { setErr("A senha deve ter ao menos 6 caracteres."); return }
  setLoading(true)

  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome },                          // guarda o nome no perfil
      emailRedirectTo: window.location.origin, // link do e-mail volta pra sua Vercel
    },
  })

  setLoading(false)
  if (error) { setErr(error.message); return }
  setOk("Conta criada! Verifique seu e-mail para confirmar o cadastro.")
}