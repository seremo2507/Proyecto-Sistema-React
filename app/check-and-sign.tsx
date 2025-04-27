import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function CheckAndSign() {
  const { id } = useLocalSearchParams(); // Obtener el id del envio

  const handleSubmit = () => {
    console.log(`Firma y checklist enviados para el envío ${id}`);
    // Aquí agregamos la lógica para completar el viaje
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Completar Viaje - Envío {id}</Text>
      {/* Aquí irían los campos de firma */}
      <TextInput style={styles.input} placeholder="Descripción del incidente (opcional)" />
      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Finalizar Entrega</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0f2027',
  },
  title: {
    fontSize: 22,
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
