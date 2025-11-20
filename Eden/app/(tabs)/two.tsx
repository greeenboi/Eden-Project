import { StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { View } from '@/components/Themed';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function TabTwoScreen() {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(true);
  const [radioValue, setRadioValue] = useState('option1');
  const [togglePressed, setTogglePressed] = useState(false);
  const [toggleGroupValue, setToggleGroupValue] = useState<string>('center');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text className="text-3xl font-bold mb-6">More Components</Text>

      {/* Checkboxes */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Checkboxes</CardTitle>
          <CardDescription>Select multiple options</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
            <Checkbox
              checked={checked1}
              onCheckedChange={setChecked1}
              aria-labelledby="checkbox1"
            />
            <Label nativeID="checkbox1">Accept terms and conditions</Label>
          </View>
          <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
            <Checkbox
              checked={checked2}
              onCheckedChange={setChecked2}
              aria-labelledby="checkbox2"
            />
            <Label nativeID="checkbox2">Subscribe to newsletter</Label>
          </View>
        </CardContent>
      </Card>

      {/* Radio Group */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Radio Group</CardTitle>
          <CardDescription>Select one option</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={radioValue} onValueChange={setRadioValue}>
            <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2 mb-3">
              <RadioGroupItem value="option1" aria-labelledby="radio1" />
              <Label nativeID="radio1">Option 1</Label>
            </View>
            <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2 mb-3">
              <RadioGroupItem value="option2" aria-labelledby="radio2" />
              <Label nativeID="radio2">Option 2</Label>
            </View>
            <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
              <RadioGroupItem value="option3" aria-labelledby="radio3" />
              <Label nativeID="radio3">Option 3</Label>
            </View>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Toggle */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Toggles</CardTitle>
          <CardDescription>Toggle buttons and groups</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
            <Toggle pressed={togglePressed} onPressedChange={setTogglePressed}>
              <Text>Toggle Me</Text>
            </Toggle>
          </View>
          <ToggleGroup type="single" value={toggleGroupValue} onValueChange={(val) => val && setToggleGroupValue(val)}>
            <ToggleGroupItem value="left" aria-label="Align left">
              <Text>Left</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center">
              <Text>Center</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right">
              <Text>Right</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>Progress indicators</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <Progress value={33} className="w-full" />
          <Progress value={66} className="w-full" />
          <Progress value={100} className="w-full" />
        </CardContent>
      </Card>

      {/* Avatars */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Avatars</CardTitle>
          <CardDescription>User profile pictures</CardDescription>
        </CardHeader>
        <CardContent className="flex-row gap-3">
          <Avatar alt="User avatar">
            <AvatarImage source={{ uri: 'https://github.com/shadcn.png' }} />
            <AvatarFallback>
              <Text>SC</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar alt="User avatar 2">
            <AvatarFallback>
              <Text>JD</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar alt="User avatar 3">
            <AvatarFallback>
              <Text>AB</Text>
            </AvatarFallback>
          </Avatar>
        </CardContent>
      </Card>

      {/* Skeleton */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Skeleton</CardTitle>
          <CardDescription>Loading placeholders</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
});
