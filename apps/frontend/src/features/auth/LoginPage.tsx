import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, type LoginRequest } from '@garden-guide/shared';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useLogin, useMe } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { Button, Card, Field, Input } from '../../components/ui';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  if (me.data) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      const from = (location.state as LocationState | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError('root', { message: err.message });
      } else {
        setError('root', { message: 'Something went wrong' });
      }
    }
  });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Welcome back to your Garden Guide.
        </p>
      </header>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6" noValidate>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
          </Field>
          {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
