export async function completeCompanyJoin({ code, form, onJoinCompany, onSuccess }) {
  // Do not report success or clear the entered code until Supabase and the
  // refreshed membership list have both confirmed the join.
  await onJoinCompany(code);
  form.reset();
  onSuccess();
}
