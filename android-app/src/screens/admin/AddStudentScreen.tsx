import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card, Text, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { addStudent, fetchStudents } from '../../store/slices/studentSlice';
import { theme } from '../../theme';

const AddStudentScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading } = useSelector((state: RootState) => state.students);

  const [formData, setFormData] = useState({
    name: '',
    current_class: '',
    admission_number: '',
    expected_fee_amount: '',
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.current_class) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user?.school_id) {
      Alert.alert('Error', 'School ID not found');
      return;
    }

    try {
      await dispatch(
        addStudent({
          school_id: user.school_id,
          name: formData.name,
          current_class: formData.current_class,
          admission_number: formData.admission_number || undefined,
          expected_fee_amount: formData.expected_fee_amount
            ? parseFloat(formData.expected_fee_amount)
            : undefined,
          status: 'active',
          repeat_year: 0,
        })
      ).unwrap();

      // Refresh students list
      await dispatch(fetchStudents(user.school_id));

      Alert.alert('Success', 'Student added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add student');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Add New Student
          </Text>

          <TextInput
            label="Student Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
          />

          <TextInput
            label="Current Class *"
            value={formData.current_class}
            onChangeText={(text) => setFormData({ ...formData, current_class: text })}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
            placeholder="e.g., Primary 1, Senior 1"
          />

          <TextInput
            label="Admission Number"
            value={formData.admission_number}
            onChangeText={(text) => setFormData({ ...formData, admission_number: text })}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
          />

          <TextInput
            label="Expected Fee Amount"
            value={formData.expected_fee_amount}
            onChangeText={(text) => setFormData({ ...formData, expected_fee_amount: text })}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            disabled={isLoading}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            disabled={isLoading}
            loading={isLoading}
          >
            Add Student
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
});

export default AddStudentScreen;


