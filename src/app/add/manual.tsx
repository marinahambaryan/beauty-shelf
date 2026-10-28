import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoField } from '@/components/photo-field';
import { Bottle } from '@/components/shelf';
import { AppText, BracketTabs, Button, Mast, Notice, PageTitle, Screen, Section, TextField, TopBar } from '@/components/ui';
import { useAddManually } from '@/data/mutations';
import { CATEGORIES, categoryLabel, OWNERSHIP_STATUSES, ownershipLabel } from '@/domain/library';
import { personalProductSchema, type PersonalProductForm, type PersonalProductInput } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { goBack } from '@/lib/navigation';
import { colors, fonts, space, type } from '@/theme/tokens';

/** Add manually: a product that isn't in the catalogue. It stays private to this person. */
export default function AddManuallyScreen() {
  const params = useLocalSearchParams<{ name?: string }>();
  const add = useAddManually();
  const [photo, setPhoto] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<PersonalProductForm, unknown, PersonalProductInput>({
    resolver: zodResolver(personalProductSchema),
    defaultValues: {
      brand: '',
      name: params.name ?? '',
      variantLabel: '',
      category: 'makeup',
      status: 'owned',
      notes: '',
    },
  });
  const [category, name] = useWatch({ control, name: ['category', 'name'] });

  const onSubmit = handleSubmit((values) =>
    add.mutate(
      { ...values, photoUri: photo },
      { onSuccess: (id) => router.replace({ pathname: '/item/[id]', params: { id, added: '1' } }) },
    ),
  );

  return (
    <Screen bottomInset>
      <TopBar onBack={() => goBack('/add')} />
      <Mast left="Add product" right="Added manually" />
      <PageTitle>{'Add it\nyourself'}</PageTitle>
      <AppText variant="bodySoft">For anything that isn’t in the catalogue. Only you can see it.</AppText>

      <PhotoField
        uri={photo}
        onChange={setPhoto}
        busy={add.isPending && Boolean(photo)}
        placeholder={<Bottle uri={null} category={category} name={name || 'Product'} scale={1.6} />}
      />

      <Controller
        control={control}
        name="brand"
        render={({ field, fieldState }) => (
          <TextField
            label="Brand"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="words"
            maxLength={120}
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Product name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="sentences"
            maxLength={200}
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="variantLabel"
        render={({ field, fieldState }) => (
          <TextField
            label="Shade or size (optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={120}
          />
        )}
      />

      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <Section label="Category">
            <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Category">
              {CATEGORIES.map((c) => {
                const selected = field.value === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => field.onChange(c)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={categoryLabel[c]}
                    style={styles.option}
                  >
                    <Text style={[type.label, styles.optionText, selected && styles.selected]}>
                      {selected ? `[${categoryLabel[c]}]` : categoryLabel[c]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Section label="Add to">
            <BracketTabs
              options={OWNERSHIP_STATUSES.map((s) => ({ value: s, label: ownershipLabel[s] }))}
              value={field.value}
              onChange={field.onChange}
              accessibilityLabel="Add to"
            />
          </Section>
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <TextField
            label="Note (optional)"
            placeholder="Where you got it, what you think so far"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
            maxLength={5000}
          />
        )}
      />

      {add.isError ? <Notice>{toAppError(add.error).message}</Notice> : null}
      <Button label="Add to library" onPress={onSubmit} loading={add.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg },
  option: { minHeight: 40, justifyContent: 'center' },
  optionText: { color: colors.inkSoft },
  selected: { color: colors.ink, fontFamily: fonts.monoMedium },
});
