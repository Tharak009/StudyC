import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, KeyRound, LoaderCircle, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usersApi } from "../api/users.api";
import { Avatar } from "../components/avatar";
import { FormField } from "../components/form-field";
import { useAuthStore } from "../store/auth.store";
import { getErrorMessage } from "../utils/errors";

const schema = z.object({
  fullName: z.string().min(2).max(100),
  department: z.string().min(2).max(100),
  academicYear: z.coerce.number().int().min(1).max(8),
  bio: z.string().max(500),
  interestsText: z.string()
});
type ProfileForm = z.infer<typeof schema>;

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user.fullName,
      department: user.department,
      academicYear: user.academicYear,
      bio: user.bio,
      interestsText: user.interests.join(", ")
    }
  });

  const update = useMutation({
    mutationFn: (values: ProfileForm) =>
      usersApi.updateProfile({
        fullName: values.fullName,
        department: values.department,
        academicYear: values.academicYear,
        bio: values.bio,
        interests: values.interestsText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      }),
    onSuccess: (nextUser) => {
      setUser(nextUser);
      queryClient.setQueryData(["profile"], nextUser);
      reset({
        fullName: nextUser.fullName,
        department: nextUser.department,
        academicYear: nextUser.academicYear,
        bio: nextUser.bio,
        interestsText: nextUser.interests.join(", ")
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    }
  });

  const upload = useMutation({
    mutationFn: usersApi.uploadProfilePicture,
    onSuccess: (nextUser) => setUser(nextUser)
  });

  const onFile = (file?: File) => {
    if (!file) return;
    upload.mutate(file);
  };

  return (
    <div className="animate-fade-up">
      <header className="border-b border-slate-200 pb-8 dark:border-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-signal-500 dark:text-signal-300">
          Account
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Profile</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Keep your student identity accurate and useful.
        </p>
      </header>

      <div className="grid gap-10 py-9 xl:grid-cols-[280px_minmax(0,720px)] xl:gap-16">
        <aside>
          <div className="relative w-fit">
            <Avatar name={user.fullName} src={user.profilePicture} className="size-28" />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
              className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border-4 border-slate-50 bg-slate-950 text-white transition-transform hover:scale-105 dark:border-ink-950 dark:bg-white dark:text-ink-950"
              aria-label="Upload profile picture"
            >
              {upload.isPending ? <LoaderCircle className="animate-spin" size={15} /> : <Camera size={15} />}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </div>
          <h2 className="mt-5 text-lg font-semibold">{user.fullName}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Check size={13} />
            Verified student
          </div>
          {upload.isError && (
            <p className="mt-3 text-xs leading-5 text-red-500">{getErrorMessage(upload.error)}</p>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
            <div className="flex items-center gap-3 text-sm">
              <KeyRound size={17} className="text-slate-400" />
              <div>
                <p className="font-medium">Password</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Change-password API is ready.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <form onSubmit={handleSubmit((values) => update.mutate(values))}>
          <section>
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Student information</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your roll number and email are managed as verified identifiers.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Full name" error={errors.fullName?.message} {...register("fullName")} />
              <FormField label="Roll number" value={user.rollNumber} readOnly className="opacity-65" />
              <FormField
                label="Department"
                error={errors.department?.message}
                {...register("department")}
              />
              <FormField
                label="Academic year"
                type="number"
                min={1}
                max={8}
                error={errors.academicYear?.message}
                {...register("academicYear", { valueAsNumber: true })}
              />
            </div>
          </section>

          <section className="mt-9 border-t border-slate-200 pt-8 dark:border-white/10">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">About you</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add context that will help classmates find the right collaborators.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Bio</span>
              <textarea
                rows={5}
                className="field resize-none"
                placeholder="What are you learning or building?"
                {...register("bio")}
              />
              <span className="mt-1.5 block text-xs text-slate-500">Maximum 500 characters</span>
            </label>
            <div className="mt-5">
              <FormField
                label="Interests"
                placeholder="Machine learning, UI design, robotics"
                hint="Separate interests with commas"
                error={errors.interestsText?.message}
                {...register("interestsText")}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {user.interests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                  >
                    <Plus size={11} />
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {update.isError && (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {getErrorMessage(update.error)}
            </p>
          )}

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-white/10">
            {isDirty && (
              <button type="button" className="secondary-button" onClick={() => reset()}>
                <X size={16} />
                Discard
              </button>
            )}
            <button className="primary-button" type="submit" disabled={update.isPending || !isDirty}>
              {update.isPending ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : saved ? (
                <Check size={17} />
              ) : null}
              {update.isPending ? "Saving..." : saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
