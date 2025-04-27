import { Drawer } from 'expo-router/drawer';
import CustomDrawer from './_drawer';

export default function Layout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        swipeEnabled: false, // ✅ Esto desactiva el gesto de deslizamiento
      }}
      drawerContent={(props) => <CustomDrawer {...props} />}
    />
  );
}
