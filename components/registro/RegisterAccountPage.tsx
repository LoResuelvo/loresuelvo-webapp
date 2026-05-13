import { RegisterForm } from "./RegisterForm";

export function RegisterAccountPage() {
  return (
    <div aria-label="Create account">
      <h1>Crear cuenta</h1>
      <p>Completa tus datos para comenzar</p>
      <RegisterForm />
    </div>
  );
}
