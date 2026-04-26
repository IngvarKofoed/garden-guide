import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterRequestSchema, type RegisterRequest } from '@garden-guide/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useMe, useRegister } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { Button, Field, Input } from '../../components/ui';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const inviteFromUrl = searchParams.get('invite') ?? '';
  const me = useMe();
  const navigate = useNavigate();
  const registerAccount = useRegister();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
    defaultValues: {
      inviteToken: inviteFromUrl,
      email: '',
      displayName: '',
      password: '',
    },
  });

  useEffect(() => {
    if (inviteFromUrl) setValue('inviteToken', inviteFromUrl);
  }, [inviteFromUrl, setValue]);

  if (me.data) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerAccount.mutateAsync(values);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError('root', { message: err.message });
      } else {
        setError('root', { message: 'Something went wrong' });
      }
    }
  });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Create account
        </h1>
        <p className="mt-2 text-sm text-muted">
          Use the invite token from your inviter (or the bootstrap token from the server logs).
        </p>
      </header>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Invite token" htmlFor="inviteToken" error={errors.inviteToken?.message}>
          <Input
            id="inviteToken"
            type="text"
            autoComplete="off"
            {...register('inviteToken')}
          />
        </Field>
        <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input
            id="displayName"
            type="text"
            autoComplete="name"
            {...register('displayName')}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>
        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}
