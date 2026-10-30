import { router, type Href } from 'expo-router';

/** Back if there is somewhere to go back to (a deep link may open a page directly). */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
