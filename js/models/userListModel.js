// js/models/userListModel.js
// Modelo para gestionar las listas de animes y videojuegos del usuario

class UserListModel {
  constructor() {
    this.listTypes = {
      FAVORITOS: "favoritos",
      VIENDO: "viendo", // Para animes
      JUGANDO: "jugando", // Para videojuegos
      CONSIDERANDO: "considerando",
      COMPLETADO: "completado",
      DROPEADO: "dropeado",
    };

    this.lists = this.loadLists();
  }

  // ==================== MÉTODOS PRINCIPALES ====================

  /**
   * Agregar un item a una lista
   * @param {string} listType - Tipo de lista (favoritos, viendo, etc.)
   * @param {Object} item - Item a agregar (anime o videojuego)
   * @param {string} mediaType - 'anime' o 'game'
   * @returns {Object} - Resultado de la operación
   */
  async addToList(listType, item, mediaType) {
    try {
      // Verificar autenticación
      if (!userModel.isLoggedIn()) {
        throw new Error("Debes iniciar sesión para agregar items a tus listas");
      }

      const userId = userModel.getCurrentUser().id;

      // TODO: Cuando se implemente la BD
      // const response = await fetch('/api/user-lists', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId, listType, item, mediaType })
      // });

      // SIMULACIÓN TEMPORAL (sin BD)
      if (!this.lists[userId]) {
        this.lists[userId] = this.createEmptyLists();
      }

      // Verificar si ya existe en esta lista
      const exists = this.lists[userId][listType].find(
        (i) => i.id === item.id && i.mediaType === mediaType
      );

      if (exists) {
        throw new Error("Este item ya está en tu lista");
      }

      // Remover de otras listas si existe
      this.removeFromAllLists(userId, item.id, mediaType);

      // Agregar a la lista especificada
      const listItem = {
        ...item,
        mediaType,
        addedAt: new Date().toISOString(),
        notes: "",
        rating: null,
      };

      this.lists[userId][listType].push(listItem);
      this.saveLists();

      return { success: true, message: "Item agregado a tu lista" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remover un item de una lista
   * @param {string} listType - Tipo de lista
   * @param {number} itemId - ID del item
   * @param {string} mediaType - 'anime' o 'game'
   * @returns {Object}
   */
  async removeFromList(listType, itemId, mediaType) {
    try {
      if (!userModel.isLoggedIn()) {
        throw new Error("Debes iniciar sesión");
      }

      const userId = userModel.getCurrentUser().id;

      // TODO: Implementar con BD
      // await fetch(`/api/user-lists/${userId}/${listType}/${itemId}`, {
      //   method: 'DELETE'
      // });

      // SIMULACIÓN TEMPORAL
      if (!this.lists[userId] || !this.lists[userId][listType]) {
        throw new Error("Lista no encontrada");
      }

      this.lists[userId][listType] = this.lists[userId][listType].filter(
        (item) => !(item.id === itemId && item.mediaType === mediaType)
      );

      this.saveLists();

      return { success: true, message: "Item removido de tu lista" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener todas las listas del usuario actual
   * @returns {Object} - Objeto con todas las listas
   */
  getUserLists() {
    if (!userModel.isLoggedIn()) {
      return this.createEmptyLists();
    }

    const userId = userModel.getCurrentUser().id;

    if (!this.lists[userId]) {
      this.lists[userId] = this.createEmptyLists();
      this.saveLists();
    }

    return this.lists[userId];
  }

  /**
   * Obtener items de una lista específica
   * @param {string} listType - Tipo de lista
   * @returns {Array}
   */
  getList(listType) {
    const lists = this.getUserLists();
    return lists[listType] || [];
  }

  /**
   * Verificar si un item está en alguna lista
   * @param {number} itemId - ID del item
   * @param {string} mediaType - 'anime' o 'game'
   * @returns {string|null} - Tipo de lista donde está o null
   */
  getItemListType(itemId, mediaType) {
    if (!userModel.isLoggedIn()) {
      return null;
    }

    const lists = this.getUserLists();

    for (const [listType, items] of Object.entries(lists)) {
      const found = items.find(
        (item) => item.id === itemId && item.mediaType === mediaType
      );
      if (found) {
        return listType;
      }
    }

    return null;
  }

  /**
   * Mover un item de una lista a otra
   * @param {number} itemId - ID del item
   * @param {string} mediaType - 'anime' o 'game'
   * @param {string} fromList - Lista origen
   * @param {string} toList - Lista destino
   * @returns {Object}
   */
  async moveToList(itemId, mediaType, fromList, toList) {
    try {
      if (!userModel.isLoggedIn()) {
        throw new Error("Debes iniciar sesión");
      }

      const userId = userModel.getCurrentUser().id;
      const lists = this.lists[userId];

      if (!lists[fromList] || !lists[toList]) {
        throw new Error("Lista no válida");
      }

      // Encontrar el item
      const itemIndex = lists[fromList].findIndex(
        (item) => item.id === itemId && item.mediaType === mediaType
      );

      if (itemIndex === -1) {
        throw new Error("Item no encontrado en la lista origen");
      }

      // Mover el item
      const item = lists[fromList].splice(itemIndex, 1)[0];
      item.addedAt = new Date().toISOString(); // Actualizar fecha
      lists[toList].push(item);

      this.saveLists();

      return { success: true, message: "Item movido exitosamente" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar notas o calificación de un item
   * @param {number} itemId - ID del item
   * @param {string} mediaType - 'anime' o 'game'
   * @param {Object} updates - { notes?, rating? }
   * @returns {Object}
   */
  async updateItem(itemId, mediaType, updates) {
    try {
      if (!userModel.isLoggedIn()) {
        throw new Error("Debes iniciar sesión");
      }

      const userId = userModel.getCurrentUser().id;
      const listType = this.getItemListType(itemId, mediaType);

      if (!listType) {
        throw new Error("Item no encontrado en tus listas");
      }

      const itemIndex = this.lists[userId][listType].findIndex(
        (item) => item.id === itemId && item.mediaType === mediaType
      );

      if (itemIndex !== -1) {
        this.lists[userId][listType][itemIndex] = {
          ...this.lists[userId][listType][itemIndex],
          ...updates,
        };
        this.saveLists();
      }

      return { success: true, message: "Item actualizado" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener estadísticas de las listas del usuario
   * @returns {Object}
   */
  getStatistics() {
    const lists = this.getUserLists();

    return {
      total: Object.values(lists).reduce((sum, list) => sum + list.length, 0),
      favoritos: lists.favoritos.length,
      viendo: lists.viendo.length,
      jugando: lists.jugando.length,
      considerando: lists.considerando.length,
      completado: lists.completado.length,
      dropeado: lists.dropeado.length,
      animes: this.countByMediaType(lists, "anime"),
      games: this.countByMediaType(lists, "game"),
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Crear estructura de listas vacías
   * @returns {Object}
   */
  createEmptyLists() {
    return {
      favoritos: [],
      viendo: [],
      jugando: [],
      considerando: [],
      completado: [],
      dropeado: [],
    };
  }

  /**
   * Remover un item de todas las listas
   * @param {number} userId - ID del usuario
   * @param {number} itemId - ID del item
   * @param {string} mediaType - 'anime' o 'game'
   */
  removeFromAllLists(userId, itemId, mediaType) {
    Object.keys(this.lists[userId]).forEach((listType) => {
      this.lists[userId][listType] = this.lists[userId][listType].filter(
        (item) => !(item.id === itemId && item.mediaType === mediaType)
      );
    });
  }

  /**
   * Contar items por tipo de media
   * @param {Object} lists - Objeto de listas
   * @param {string} mediaType - 'anime' o 'game'
   * @returns {number}
   */
  countByMediaType(lists, mediaType) {
    return Object.values(lists).reduce((count, list) => {
      return count + list.filter((item) => item.mediaType === mediaType).length;
    }, 0);
  }

  /**
   * Cargar listas desde localStorage
   * @returns {Object}
   */
  loadLists() {
    const lists = localStorage.getItem("userLists");
    return lists ? JSON.parse(lists) : {};
  }

  /**
   * Guardar listas en localStorage
   */
  saveLists() {
    localStorage.setItem("userLists", JSON.stringify(this.lists));
  }

  /**
   * Limpiar todas las listas del usuario actual
   */
  clearUserLists() {
    if (!userModel.isLoggedIn()) {
      return;
    }

    const userId = userModel.getCurrentUser().id;
    this.lists[userId] = this.createEmptyLists();
    this.saveLists();
  }
}

// Crear instancia global
const userListModel = new UserListModel();
